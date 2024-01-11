/* eslint-disable import/extensions */
const Notification = require('../models/notification.model');
const Messages = require('../config/messages.js');
const OneSignal = require('onesignal-node');
const {NOTIFICATION_TYPE, SOCKET_EVENT} = require('../config/constants');

const onesignalClient = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_APP_AUTHKEY);

async function create(data) {
  return new Promise(async (resolve) => {
    const n = Notification();
    n.creator = data.creator;
    n.receiver = data.receiver;
    n.type = data.type;
    n.createdAt = Date.now();
    if (data.story) {
      n.story = data.story;
    }
    await n.save();

    const notification = await Notification.findById(n._id)
    .populate('creator')
    .populate('receiver')
    .populate('story');

    const creatorName = notification.creator.name;
    const message = creatorName + ' ' + getMessageForType(notification.type);
    const playerIds = [];
    const extraData = {
      notificationId: notification._id,
      notificationType: notification.type,
    };

    if (notification.story && notification.story._id) {
      extraData.storyId = notification.story._id;
    }

    if (
      notification.receiver.iOSDeviceToken &&
      notification.receiver.iOSDeviceToken.length > 0 &&
      notification.receiver.iOSDeviceToken !== 'undefined' &&
      notification.receiver.iOSDeviceToken !== 'null'
    ) {
      playerIds.push(notification.receiver.iOSDeviceToken);
    }

    if (
      notification.receiver.androidDeviceToken &&
      notification.receiver.androidDeviceToken.length > 0 &&
      notification.receiver.androidDeviceToken !== 'undefined' &&
      notification.receiver.androidDeviceToken !== 'null'
    ) {
      playerIds.push(notification.receiver.androidDeviceToken);
    }

    if (playerIds.length > 0) {
      sendPushNotification(message, playerIds, extraData);
    }

    sendNewNotificationEvent(notification);

    resolve(n);
  });
}

async function getMyList(req, res) {
  const {currentUser} = req;
  const notifications = await Notification.find({receiver: currentUser._id})
  .sort({createdAt: 'desc'})
  .populate('creator')
  .populate('receiver')
  .populate('story');

  const list = [];
  notifications.forEach((n) => {
    const message = getMessageForType(n.type);
    n.message = message;
    list.push(n);
  });

  res.json({
    result: true,
    notifications: list,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ////////////////////// Mark Read Notification ////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function markRead(req, res) {
  const {id} = req.body;
  const n = await Notification.findById(id);
  if (n) {
    n.isRead = true;
    await n.save();
    res.json({
      result: true,
      notification: n,
    });
  } else {
    res.json({
      result: false,
      error: Messages.NOTIFITION_NOT_EXIST,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////// Get Unread Number. //////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getUnreadNumber(req, res) {
  const {currentUser} = req;
  const count = await Notification.countDocuments({
    receiver: currentUser._id,
    isRead: false,
  });
  res.json({
    result: true,
    count,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////// Mark as Read for all notifications. /////////////////
/// //////////////////////////////////////////////////////////////////////
async function markAsReadAll(req, res) {
  const {currentUser} = req;
  const notifications = await Notification.find({
    receiver: currentUser._id,
    isRead: false,
  });
  if (notifications && notifications.length > 0) {
    notifications.forEach((n) => {
      n.isRead = true;
      n.save();
    });
  }
  res.json({
    result: true,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////// Remove all notifications of user. //////////////////
/// //////////////////////////////////////////////////////////////////////
async function removeAll(req, res) {
  const {currentUser} = req;
  await Notification.deleteMany({receiver: currentUser._id});
  res.json({
    result: true,
  });
}

function getMessageForType(type) {
  let message = '';
  if (type === NOTIFICATION_TYPE.COMMNET_STORY) {
    message = 'commented on your story';
  } else if (type === NOTIFICATION_TYPE.REPLIED_COMMENT_STORY) {
    message = 'replied on your comment';
  } else if (type === NOTIFICATION_TYPE.SUBSCRIBE_USER) {
    message = 'subscribed to you.';
  }
  // else if (type === NOTIFICATION_TYPE.REVIEWD_STORY) {
  //   message = 'reviewed on your story';
  // }
  return message;
}

function sendPushNotification(message, playerIds, data) {
  const notification = {
    contents: {
      en: message,
    },
    include_player_ids: playerIds,
    data,
  };

  console.log('notification: ', notification);
  onesignalClient
    .createNotification(notification)
    .then((response) => {
      console.log('push sent: ', response.body);
    })
    .catch((e) => {
      console.log('push error: ', e);
    });
}

// Send new notification event.
async function sendNewNotificationEvent(notification) {
  if (notification.receiver && notification.receiver._id
    && global.userSockets 
    && global.userSockets.length > 0
  ) {
    global.userSockets.forEach(s => {
      if (String(s.user) === String(notification.receiver._id)) {
        s.emit(SOCKET_EVENT.NEW_NOTIFICATION, notification);
      }
    });
  }
}

module.exports = {
  create,
  getMyList,
  markRead,
  getUnreadNumber,
  markAsReadAll,
  removeAll,
  sendPushNotification,
};
