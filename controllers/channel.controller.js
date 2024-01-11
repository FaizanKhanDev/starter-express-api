const {SOCKET_EVENT, MESSAGE_TYPE} = require('../config/constants');
const Channel = require('../models/channel.model');
const Message = require('../models/message.model');

const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');

aws.config.update({
  secretAccessKey: process.env.AWS_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_ID,
  region: process.env.AWS_REGION,
});

var s3 = new aws.S3();
var upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    acl: 'public-read',
    key(req, file, cb) {
      console.log('uploading files');
      console.log(file);
      console.log('======================');
      cb(null, Date.now() + file.originalname); // use Date.now() for unique file keys
    },
  }),
}).any();


/////////////////////////////////////////////////////////////////////////
///////////////////////////// Get Channel ///////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function get(req, res) {
  const {id} = req.query;
  const {currentUser} = req;
  
  let channel = await Channel.findOne({members: {$all: [id, currentUser._id]}})
  .populate('members')
  .populate('lastMessage');
  
  // Create Channel.
  if (!channel) {
    channel = new Channel();
    channel.createdAt = Date.now();
    channel.members = [id, currentUser._id];
    channel.lastRead = [
      {userId: id},
      {userId: currentUser._id},
    ];
    await channel.save();

    // Send add channel socket event.
    channel = await Channel.findById(channel._id)
    .populate('members')
    .populate('lastMessage');
    sendAddChannelEvent(channel);
  }

  return res.json({
    channel,
  });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////// Get My Channels /////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getMyList(req, res) {
  const {currentUser} = req;
  
  const channels = await Channel.find({members: currentUser._id})
  .populate('members')
  .populate('lastMessage');

  return res.json({
    channels,
  });
}

/////////////////////////////////////////////////////////////////////////
///////////////////////// Get Messages of Channel ///////////////////////
/////////////////////////////////////////////////////////////////////////
async function getMessages(req, res) {
  const {id} = req.query;
  const {currentUser} = req;
  
  const messages = await Message.find({channel: id})
  .sort({createdAt: -1})
  .populate('creator');

  // last message mark as read.
  if (messages && messages.length > 0) {
    const lastMessage = messages[0];
    let channel = await Channel.findById(id)
    .populate('members')
    .populate('lastMessage');

    if (channel) {
      let lastRead = channel.lastRead;
      if (lastRead) {
        lastRead.forEach(item => {
          if (item.userId === String(currentUser._id)) {
            item.message = lastMessage._id;
            return;
          } 
        });
      }

      channel.lastRead = lastRead;
      await channel.save();
      sendUpdateChannelEvent(channel);
    }        
  }

  return res.json({
    messages,
  });
}

/////////////////////////////////////////////////////////////////////////
///////////////////////////// Leave Channel /////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function leave(req, res) {
  const {id} = req.body;
  const {currentUser} = req;

  const lastMessage = await Message.findOne({channel: id})
  .sort({createdAt: -1});

  const channel = await Channel.findById(id)
    .populate('members')
    .populate('lastMessage');

  if (channel && lastMessage) {
    let lastRead = channel.lastRead;
    if (lastRead) {
      lastRead.forEach(item => {
        if (item.userId === String(currentUser._id)) {
          item.message = lastMessage._id;
          return;
        } 
      });
    }
    channel.lastRead = lastRead;
    await channel.save();
    sendUpdateChannelEvent(channel);
  } 
  
  return res.json({
    channel,
  });
}

/////////////////////////////////////////////////////////////////////////
///////////////////////////// Delete Channel ////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function deleteChannel(req, res) {
  const {id} = req.query;

  const channel = await Channel.findById(id).populate('members');
  await Message.deleteMany({channel: id});
  await Channel.findByIdAndDelete(id);

  sendDeleteChannelEvent(channel);
  
  return res.json({
    id,
  });
}

/////////////////////////////////////////////////////////////////////////
///////////////////////////// Send Message //////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function sendMessage(req, res) {
  upload(req, res, async (error) => {
    if (error) {
      return res.json({
        error,
      });
    }

    const {channelId, message, type, width, height} = req.body;
    const {currentUser} = req;

    // Create Message.
    let m = new Message();
    m.channel = channelId;
    m.creator = currentUser._id;
    m.type = type;
    m.createdAt = Date.now();

    if (type === MESSAGE_TYPE.TEXT) {
      m.message = message;
    } else if (type === MESSAGE_TYPE.PHOTO) {
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        m.message = file.location;
        m.width = width;
        m.height = height;
      }
    }
    await m.save();

    // Send socket event.
    m = await Message.findById(m._id).populate('creator');
    sendAddMessageEvent(channelId, m);

    let channel = await Channel.findById(channelId).populate('members');

    if (channel) {
      let lastRead = channel.lastRead;

      if (lastRead) {
        lastRead.forEach(item => {
          if (item.userId === String(currentUser._id)) {
            item.message = m._id;
            return;
          } 
        });
      }
      channel.lastMessage = m;
      channel.lastRead = lastRead;
      await channel.save();

      sendUpdateChannelEvent(channel);
    }

    return res.json({
      message: m,
    });
  });
}

// Add message socket event.
async function sendAddMessageEvent(channelId, message) {
  if (global.channelSockets && global.channelSockets.length > 0) {
    global.channelSockets.forEach(s => {
      if (s.channel === channelId) {
        s.emit(SOCKET_EVENT.ADD_MESSAGE, message);
      }
    });
  }
}

// Add channel socket event.
async function sendAddChannelEvent(channel) {
  if (channel && channel.members.length > 0 
    && global.userSockets 
    && global.userSockets.length > 0
  ) {
    global.userSockets.forEach(s => {
      const index = channel.members.findIndex(m => String(m._id) === String(s.user));
      if (index >= 0) {
        s.emit(SOCKET_EVENT.ADD_CHANNEL, channel);
      }
    });
  }
}

// Update channel socket event.
async function sendUpdateChannelEvent(channel) {
  if (channel && channel.members.length > 0 
    && global.userSockets 
    && global.userSockets.length > 0
  ) {
    global.userSockets.forEach(s => {
      const index = channel.members.findIndex(m => String(m._id) === String(s.user));
      if (index >= 0) {
        s.emit(SOCKET_EVENT.UPDATE_CHANNEL, channel);
      }
    });
  }
}

// Delete channel socket event.
async function sendDeleteChannelEvent(channel) {
  // Check user sockets.
  if (channel && channel.members.length > 0 
    && global.userSockets 
    && global.userSockets.length > 0) {
    global.userSockets.forEach(s => {
      const index = channel.members.findIndex(m => String(m._id) === String(s.user));
      if (index >= 0) {
        s.emit(SOCKET_EVENT.REMOVE_CHANNEL, channel._id);
      }
    });
  }

  // Check channel sockets.
  if (global.channelSockets && global.channelSockets.length > 0) {
    global.channelSockets.forEach(s => {
      if (String(s.channel) === String(channel._id)) {
        s.emit(SOCKET_EVENT.REMOVE_CHANNEL, channel._id);
      }
    });
  }
}

module.exports = {
  get,
  getMyList,
  getMessages,
  sendMessage,
  leave,
  deleteChannel,
};
