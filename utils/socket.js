const jwt = require('jsonwebtoken');

const {SOCKET_EVENT, SOCKET_TYPE} = require('../config/constants');
const User = require('../models/user.model');

const setupExtension = (io, userSockets, channelSockets) => {
  io.on('connection', (socket) => {
    console.log('socket is connected...');
    socket.emit(SOCKET_EVENT.CONNECTED);

    socket.on(SOCKET_EVENT.JOIN, async (data) => {
      const {token, type, channel} = data;
      socket.type = type;
      try {
        const response = await checkAuth(token);
        if (response && response._id) {
          socket.user = response._id;
          if (socket.type === SOCKET_TYPE.CHANNEL) {
            socket.channel = channel;
            channelSockets.push(socket); 
          } else if (socket.type === SOCKET_TYPE.USER) {
            userSockets.push(socket); 
          }
        }
        
      } catch (e) {
        console.error(e);
      }      
    });

    socket.on('disconnect', () => {
      console.log("socket is disconnected...");

      // Remove socket from socket array.
      if (socket.type === SOCKET_TYPE.CHANNEL) {
        const index = channelSockets.findIndex(s => s.id === socket.id);
        if (index >= 0) {
          channelSockets.splice(index, 1);
        }
      } else if (socket.type === SOCKET_TYPE.USER) {
        const index = userSockets.findIndex(s => s.id === socket.id);
        if (index >= 0) {
          userSockets.splice(index, 1);
        }
      }
    });
  });
};

/////////////////////////////////////////////////////////////////////////
////////////////////////// Check Token //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
const checkAuth = async (token) => {
  return new Promise(async function(resolve, reject) {
    if (!token) {
      reject('token is not existing.');
    }
  
    let decoded;
    try {
      decoded = jwt.decode(token, process.env.JWT_SECRET);
    } catch (error) {
      reject(error);
    }
  
    if (decoded && decoded.id) {
      const user = await User.findById(decoded.id);
      if (user && user._id) {
        resolve(user);
      } else {
        reject('No user');
      }
    } else {
      reject('No user');
    }
  });
}

module.exports = {
  setupExtension,
};