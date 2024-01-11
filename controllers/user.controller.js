/* eslint-disable import/extensions */
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const jwt = require('jsonwebtoken');

const { ACTIVITY_TYPE, NOTIFICATION_TYPE } = require('../config/constants.js');

// Controller.
const ActivityController = require('./activity.controller');
const NotificationController = require('./notification.controller');

// Load Models.
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const Story = require('../models/story.model');
const Report = require('../models/report.model');
const Question = require('../models/question.model');
const VerificationCode = require('../models/verificationcode.model');
const Subscribe = require('../models/subscribe.model');

const Config = require('../config/config.js');
const Messages = require('../config/messages.js');
const Cryptr = require('cryptr');

const cryptr = new Cryptr(process.env.JWT_SECRET);
const fs = require('fs');
const { USER_TYPE } = require('../config/constants');

// Email Services.
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mailgunClient = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

aws.config.update({
  secretAccessKey: process.env.AWS_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();
const upload = multer({
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
////////////////////////// Check Token //////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function checkAuth(req, res, next) {
  const token = req.get('Authorization');
  if (!token) {
    return res.status(401).send({
      status: false,
    });
  }

  let decoded;

  try {
    decoded = jwt.decode(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).send({
      status: false,
    });
  }

  if (decoded.id) {
    const user = await User.findById(decoded.id);
    if (user && user._id) {
      req.currentUser = user;
      next();
    } else {
      return res.status(401).send({
        status: false,
        error: `NO_TOKEN_USER`,
      });
    }
  } else {
    return res.status(401).send({
      status: false,
      error: `NO_TOKEN_USER`,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
//////////////////////////// Login //////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function login(req, res) {
  const { email, password, device_token, os } = req.body;
  const user = await User.findOne({
    $and: [
      {
        $or: [{ email }, { username: email }],
      },
      { deleted: false },
    ],
  });
  if (!user) {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
    return;
  }

  if (!user.isPublished) {
    res.json({
      result: false,
      error: Messages.ACCOUNT_IN_REVIEW,
    });
    return;
  }

  if (user.socialType && user.socialType.length > 0) {
    let error = Messages.INCORRECT_PASSWORD;
    if (user.socialType === 'facebook') {
      error = Messages.LOGIN_WITH_FACEBOOK;
    } else if (user.socialType === 'google') {
      error = Messages.LOGIN_WITH_GOOGLE;
    } else if (user.socialType === 'apple') {
      error = Messages.LOGIN_WITH_APPLE;
    }
    return res.json({
      result: false,
      error,
    });
  } else {
    const decryptedString = cryptr.decrypt(user.password);
    if (decryptedString === password) {
      if (device_token && device_token.length > 0) {
        if (os === 'ios') {
          user.iOSDeviceToken = device_token;
        } else {
          user.androidDeviceToken = device_token;
        }
      }

      // Remain activity history.
      ActivityController.create({
        name: ACTIVITY_TYPE.LOGIN,
        creator: user._id,
      });

      // Generate Token.
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {});
      user.save();

      return res.json({
        result: true,
        user: { ...user._doc, password: undefined },
        token,
      });
    } else {
      res.json({
        result: false,
        error: Messages.INCORRECT_PASSWORD,
      });
    }
  }
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////// Login With Social ///////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function loginWithSocial(req, res) {
  const { user } = req.body;

  // Check user is existing with same email already.
  if (user.email && user.email.length > 0) {
    const u = await User.findOne({
      email: user.email,
      deleted: false,
      $or: [{ socialType: '' }, { socialType: { $exists: false } }],
    });
    if (u && u._id) {
      res.json({
        result: false,
        error: Messages.ACCOUNT_EXISTING_BY_EMAIL,
      });
      return;
    }
  }

  const filters = {
    socialId: user.socialId,
    socialType: user.socialType,
    deleted: false,
  };
  if (user.email && user.email.length > 0) {
    filters['email'] = user.email;
  }

  const u = await User.findOne(filters);
  if (!u) {
    // Signup.
    const newUser = User();
    newUser.name = user.name;
    newUser.email = user.email;
    newUser.socialId = user.socialId;
    newUser.socialType = user.socialType;
    newUser.avatar = user.avatar;
    newUser.createdAt = Date.now();
    newUser.isPublished = true;
    newUser.type = USER_TYPE.USER;
    newUser.geolocation.coordinates = [user.lng, user.lat];
    if (user.device_token && user.device_token.length > 0) {
      if (user.os === 'ios') {
        newUser.iOSDeviceToken = user.device_token;
      } else {
        newUser.androidDeviceToken = user.device_token;
      }
    }
    await newUser.save();

    // Generate Token.
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {});

    res.json({
      result: true,
      user: newUser,
      token,
    });
  } else {
    if (!u.isPublished) {
      res.json({
        result: false,
        error: Messages.ACCOUNT_IN_REVIEW,
      });
      return;
    }

    if (user.deviceToken && user.deviceToken.length > 0) {
      if (user.os === 'ios') {
        u.iOSDeviceToken = user.deviceToken;
      } else {
        u.androidDeviceToken = user.deviceToken;
      }
    }

    // Remain activity history.
    ActivityController.create({
      name: ACTIVITY_TYPE.LOGIN,
      creator: u._id,
    });

    // Generate Token.
    const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, {});
    await u.save();

    res.json({
      result: true,
      token,
      user: { ...u._doc, password: undefined },
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// /////////////////////// Check Email ///////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function checkEmail(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email, deleted: false });

  if (user) {
    res.json({
      result: false,
      error: Messages.EMAIL_IN_USE,
    });
    return;
  }

  res.json({
    result: true,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// //////////////////////// Register /////////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function register(req, res) {
  upload(req, res, async (error) => {
    if (error) {
      return res.json({
        result: false,
        error,
      });
    }

    var { name, username, email, password, device_token, socialId, socialType, avatar, os, lat, lng } = req.body;

    if (req.files.length > 0) {
      const file = req.files[0];
      avatar = file.location;
    }

    const cryptPassword = cryptr.encrypt(password);

    // Check Email.
    let user = await User.findOne({ email, deleted: false });
    if (user) {
      res.json({
        result: false,
        error: Messages.EMAIL_IN_USE,
      });
      return;
    }

    // Check Username.
    user = await User.findOne({ username, deleted: false });
    if (user) {
      res.json({
        result: false,
        error: Messages.USERNAME_IN_USE,
      });
      return;
    }

    const newUser = User();
    newUser.type = USER_TYPE.USER;
    newUser.name = name;
    newUser.username = username;
    newUser.email = email;
    newUser.password = cryptPassword;
    newUser.geolocation.coordinates = [lng, lat];
    if (socialId && socialId.length > 0) {
      newUser.socialId = socialId;
    }
    if (socialType && socialType.length > 0) {
      newUser.socialType = socialType;
    }
    if (avatar && avatar.length > 0) {
      newUser.avatar = avatar;
    }
    newUser.createdAt = Date.now();
    newUser.isPublished = true;

    if (device_token && device_token.length > 0) {
      if (os === 'ios') {
        newUser.iOSDeviceToken = device_token;
      } else {
        newUser.androidDeviceToken = device_token;
      }
    }

    await newUser.save();

    // Remain activity history.
    ActivityController.create({
      name: ACTIVITY_TYPE.SIGNUP,
      creator: newUser._id,
    });

    // Generate Token.
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {});
    res.json({
      result: true,
      user: { ...newUser._doc, password: undefined },
      token,
    });
  });
}

/// ///////////////////////////////////////////////////////////////////
/// //////////////////////// Get User /////////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getUser(req, res) {
  const { userId } = req.body;
  const user = await User.findById(userId);

  if (!user) {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
    return;
  }

  res.json({
    result: true,
    user,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// ////////////////////// Forgot Password ////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email, deleted: false });
  if (user && user._id) {
    if (user.socialType == null || user.socialType === '') {
      const username = user.name;
      const code = makeCode(Config.FORGOT_CODE_LENGTH);
      const type = 'reset_password';

      // Check if there is an existing verify request for email.
      const record = await VerificationCode.findOne({ type, object: email });
      if (record) {
        record.code = code;
        record.createdAt = Date.now();
        record.save();
      } else {
        const v = VerificationCode();
        v.code = code;
        v.type = type;
        v.object = user.email;
        v.createdAt = Date.now();
        v.save();
      }
      sendForgotEmail(username, email, code);
      res.json({
        result: true,
        message:
          'We sent you a verification code. Please check your email. Code will expire in ' +
          Config.FORGOT_CODE_EXPIRE_TIME +
          ' minutes.',
      });
    } else {
      let message = '';
      if (user.socialType === 'google') {
        message = Messages.GOOGLE_FORGOT_PASSWORD;
      } else if (user.socialType === 'facebook') {
        message = Messages.FB_FORGOT_PASSWORD;
      } else if (user.socialType === 'apple') {
        message = Messages.APPLE_FORGOT_PASSWORD;
      }
      res.json({
        result: false,
        error: message,
      });
    }
  } else {
    res.json({
      result: false,
      error: Messages.VERIFY_CANT_FIND_EMAIL,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////// Verify Reset Code ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function verifyResetCode(req, res) {
  const { email, code } = req.body;
  const row = await VerificationCode.findOne({
    type: 'reset_password',
    object: email,
    code,
  });

  if (!row) {
    res.json({
      result: false,
      error: Messages.INCORRECT_VERIFY_CODE,
    });
    return;
  }

  const firstDate = row.createdAt;
  const secondDate = Date.now();

  const timeDifference = Math.abs(secondDate - firstDate);
  const diffMin = Math.ceil(timeDifference / (1000 * 60));

  if (diffMin >= Config.FORGOT_CODE_EXPIRE_TIME) {
    res.json({
      result: false,
      error: Messages.VERIFY_CODE_EXPIRED,
    });
    return;
  }

  res.json({
    result: true,
    message: Messages.VERIFY_CODE_MATCHED,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// //////////////////// Reset New Password ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function resetNewPassword(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    user.password = cryptr.encrypt(password);
    user.save();
    res.json({
      result: true,
      message: Messages.RESET_NEW_PASSWORD_COMPLETED,
    });
  } else {
    res.json({
      result: false,
      error: Messages.VERIFY_CANT_FIND_EMAIL,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////// Change Password /////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function changePassword(req, res) {
  const { id, old_password, new_password } = req.body;
  const user = await User.findById(id);

  if (user) {
    const originalPass = cryptr.decrypt(user.password);
    if (originalPass === old_password) {
      user.password = cryptr.encrypt(new_password);
      user.save();
      res.json({
        result: true,
        message: Messages.CHANGE_PASSWORD_COMPLETED,
      });
    } else {
      res.json({
        result: false,
        error: Messages.PASSWORD_NOT_CORRECT,
      });
    }
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// ////////////////////// Update Profile /////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function updateProfile(req, res) {
  upload(req, res, async (error) => {
    if (error) {
      return res.json({
        result: false,
        error,
      });
    }

    const { id, name, username, email } = req.body;
    let avatar = null;
    if (req.files.length > 0) {
      const file = req.files[0];
      avatar = file.location;
    }

    const user = await User.findById(id);
    if (user) {
      user.name = name;
      if (avatar && avatar.length > 0) {
        user.avatar = avatar;
      }

      // Check email.
      if (email && email.length > 0) {
        if (user.email !== email) {
          const checkUser = await User.findOne({ email, deleted: false });
          if (checkUser) {
            res.json({
              result: false,
              error: Messages.EMAIL_IN_USE,
            });
            return;
          }

          user.email = email;
        }
      }

      // Check username.
      if (username && username.length > 0) {
        if (user.username !== username) {
          const checkUser = await User.findOne({ username, deleted: false });
          if (checkUser) {
            res.json({
              result: false,
              error: Messages.USERNAME_IN_USE,
            });
            return;
          }

          user.username = username;
        }
      }

      await user.save();
      res.json({
        result: true,
        user,
      });
    }
  });
}

function makeCode(length) {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function sendForgotEmail(username, email, code) {
  let html = fs.readFileSync('./email_templates/forgot_email_template.html', 'utf8');
  html = html.replace('{{username}}', username);
  html = html.replace('{{code}}', code);
  const mailOptions = {
    from: `${Config.APP_NAME} Admin Support <${Config.ADMIN_EMAIL}>`,
    to: [email],
    subject: Config.APP_NAME + ' Password Reset',
    html,
  };

  mailgunClient.messages
    .create(process.env.MAILGUN_DOMAIN, mailOptions)
    .then((msg) => console.log('Forgot Email Sent: ', msg))
    .catch((err) => console.log('Forgot Email Failed: ', err));
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Delete Account /////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function deleteAccount(req, res) {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (user && user._id) {
    user.deleted = true;
    user.deletedAt = Date.now();
    await user.save();

    res.json({
      result: true,
      userId,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// ////////////////////// Check Remove Accounts /////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function checkRemoveAccounts() {
  const time = Date.now() + Config.DELETE_ACCOUNT_LIFETIME * 24 * 3600 * 1000;
  const users = await User.find({ deleted: true, date: { $lte: time } });
  users.forEach((u) => {
    removeUser(u._id);
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Get Profile Detail /////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function getProfileDetail(req, res) {
  const {userId} = req.body;
  const user = await User.findById(userId);
  if (user && user._id) {
    const stories = await Story.find({creator: userId})
    .sort({createdAt: 'desc'})
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator')
    .exec();
    
    // Get subscribers.
    let list = await Subscribe.find({user: userId}).populate('subscriber');
    let users = [];
    if (list && list.length > 0) {
      list.forEach(item => {
        users.push(item.subscriber);
      });
    }

    res.json({
      result: true,
      user,
      stories,
      subscribers: users,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////// Subscribe ///////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function subscribe(req, res) {
  const {id} = req.body;

  let s = await Subscribe.findOne({
    user: id,
    subscriber: req.currentUser._id,
  });

  // Already subscribed.
  if (s && s._id) {
    await Subscribe.findByIdAndDelete(s._id);
  } else {
    s = Subscribe();
    s.user = id;
    s.subscriber = req.currentUser._id;
    s.createdAt = Date.now();
    await s.save();

    // Send Notification
    NotificationController.create({
      type: NOTIFICATION_TYPE.SUBSCRIBE_USER,
      creator: req.currentUser._id,
      receiver: id,
    });
  }
  res.json({
    result: true,
  });
}

/////////////////////////////////////////////////////////////////////////
//////////////////////////// Get Subscribers ////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getSubscribers(req, res) {
  const {id} = req.query;
  let list = await Subscribe.find({user: id})
  .populate('subscriber');

  let users = [];
  if (list && list.length > 0) {
    list.forEach(item => {
      users.push(item.subscriber);
    });
  }
  res.json({
    result: true,
    users,
  });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////// Get Subscriptions ///////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getSubscriptions(req, res) {
  const {id} = req.query;
  let list = await Subscribe.find({subscriber: id})
  .populate('user');

  let users = [];
  if (list && list.length > 0) {
    list.forEach(item => {
      users.push(item.user);
    });
  }
  res.json({
    result: true,
    users,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// /////////////////////////// Block User ///////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function block(req, res) {
  const { userId, blockUserId } = req.body;
  const user = await User.findById(userId);
  if (user && user._id) {
    if (user.blockedUsers) {
      const index = user.blockedUsers.findIndex((item) => item === blockUserId);
      if (index >= 0) {
        user.blockedUsers.splice(index, 1);
      } else {
        user.blockedUsers.push(blockUserId);
      }
    } else {
      user.blockedUsers = [blockUserId];
    }
    await user.save();
    res.json({
      result: true,
      user,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// /////////////////////// Get Global Data ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getGlobalData(req, res) {
  const { userId } = req.body;

  // Get Unread Notification Count.
  const unreadNotificationCount = await Notification.countDocuments({
    receiver: userId,
    isRead: false,
  });

  res.json({
    result: true,
    unreadMessageCount: 0,
    unreadNotificationCount,
  });
}

async function removeUser(userId) {
  await Notification.deleteMany({
    $or: [{ creator: userId }, { receiver: userId }],
  });
  await Question.deleteMany({ creator: userId });
  await Report.deleteMany({ reporter: userId });

  await User.findByIdAndDelete(userId);
}

/// //////////////////////////////////////////////////////////////////////
/// /////////////////////// Update Device Data ///////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function updateDeviceData(req, res) {
  const { userId, deviceToken, os } = req.body;
  const user = await User.findById(userId);
  if (user && user._id) {
    if (os === 'ios') {
      user.iOSDeviceToken = deviceToken;
    } else if (os === 'android') {
      user.androidDeviceToken = deviceToken;
    }
    await user.save();

    res.json({
      result: true,
      user,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

module.exports = {
  checkAuth,
  checkEmail,
  login,
  loginWithSocial,
  register,
  getUser,
  forgotPassword,
  verifyResetCode,
  resetNewPassword,
  changePassword,
  updateProfile,
  deleteAccount,
  checkRemoveAccounts,
  subscribe,
  getSubscribers,
  getSubscriptions,
  getProfileDetail,
  block,
  getGlobalData,
  updateDeviceData,
};
