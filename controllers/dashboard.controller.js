/* eslint-disable import/extensions */
const moment = require('moment');
const jwt = require('jsonwebtoken');
const Config = require('../config/config.js');
const Messages = require('../config/messages.js');
const Cryptr = require('cryptr');

const cryptr = new Cryptr(process.env.JWT_SECRET);
const fs = require('fs');
const { USER_TYPE, DURATION_TYPE } = require('../config/constants.js');

// Load Models.
const User = require('../models/user.model');
const Question = require('../models/question.model');
const Story = require('../models/story.model');
const Report = require('../models/report.model');
const Activity = require('../models/activity.model');

// Email Services.
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mailgunClient = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

/// ///////////////////////////////////////////////////////////////////
/// /////////////////////// Login Merchant ////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function loginMerchant(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email, type: USER_TYPE.ADMIN });
  if (!user) {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
    return;
  }

  const decryptedString = cryptr.decrypt(user.password);
  if (decryptedString === password) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {});
    res.json({
      result: true,
      user,
      token,
    });
  } else {
    res.json({
      result: false,
      error: Messages.PASSWORD_IS_CORRECT,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////////// Get All Users ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getAllUsers(req, res) {
  const users = await User.find({ deleted: false, type: USER_TYPE.USER }, null, { sort: { createdAt: 'asc' } });
  res.json({
    result: true,
    users,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////// Get Dashboard Data //////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getDashboard(req, res) {
  const totalUsers = await User.countDocuments({
    deleted: false,
    type: USER_TYPE.USER,
  });
  const totalStories = await Story.countDocuments({});
  const totalQuestions = await Question.countDocuments({});

  res.json({
    result: true,
    totalUsers,
    totalStories,
    totalQuestions,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////// Get Activity Data ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getActivityData(req, res) {
  const { duration } = req.body;

  let labels = [];
  let startDate = null;
  let endDate = null;

  if (duration === DURATION_TYPE.DAY) {
    startDate = moment().startOf('month');
    endDate = moment();
    const lastDay = moment().endOf('month').format('DD');
    for (let i = 1; i <= lastDay; i++) {
      labels.push(i + '');
    }
  } else if (duration === DURATION_TYPE.WEEK) {
    startDate = moment().startOf('week');
    endDate = moment();
    labels = ['Mon', 'Thu', 'Web', 'Thr', 'Fri', 'Sat', 'Sun'];
  } else if (duration === DURATION_TYPE.MONTH) {
    startDate = moment().startOf('month');
    endDate = moment();
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  let filters = {};
  if (startDate && endDate) {
    filters = {
      createdAt: { $gte: startDate.unix() * 1000, $lte: endDate.unix() * 1000 },
    };
  }

  const data = await Activity.find(filters, null, {
    sort: { createdAt: 'asc' },
  });
  res.json({
    result: true,
    labels,
    data,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////// Get Activity of User ////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getActivityOfUser(req, res) {
  const { userId } = req.body;
  const data = await Activity.find({ creator: userId }, null, {
    sort: { createdAt: 'asc' },
  });
  res.json({
    result: true,
    data,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// //////////////////// Change Approve Status ////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function changeApproveStatus(req, res) {
  const { userId, status } = req.body;
  const user = await User.findById(userId);
  if (user) {
    user.isPublished = status;
    user.save();

    if (user.isPublished) {
      const username = user.name;
      sendApproveEmail(username, user.email);
    }

    res.json({
      result: true,
      user,
    });
  } else {
    res.json({
      result: false,
      message: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// ///////////////////////// Get All Story ///////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getAllStories(req, res) {
  const stories = await Story.find({}, null, { sort: { createdAt: 'asc', },  })

    .populate('creator')
    .populate('reviews.creator');
  res.json({
    result: true,
    stories,
  });
  console.log("getAllStories", JSON.stringify(stories));
}

/// //////////////////////////////////////////////////////////////////////
/// ////////////////////// Change Block Status ///////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function changeBlockStatus(req, res) {
  const { storyId, status } = req.body;
  const story = await Story.findById(storyId).populate('creator').populate('reviews.creator');

  if (story && story._id) {
    story.isBlocked = status;
    await story.save();

    res.json({
      result: true,
      story,
    });
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////// Change Feature of Story /////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function changeFeature(req, res) {
  const { storyId } = req.body;
  const story = await Story.findById(storyId).populate('creator').populate('reviews.creator');

  if (story && story._id) {
    story.featured = !story.featured;
    await story.save();

    res.json({
      result: true,
      story,
    });
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Pinned / un Pinned /////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function changePinned(req, res) {
  const { storyId } = req.body;
  console.log("changePinned",  JSON.stringify(storyId));

  const story = await Story.findById(storyId).populate('creator').populate('reviews.creator');

  if (story && story._id) {
    story.isPinned = !story.isPinned;
    await story.save();

    res.json({
      result: true,
      story,
    });
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}






/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Block / Unblock /////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function removeReview(req, res) {
  const { storyId, reviewId } = req.body;
  const story = await Story.findById(storyId).populate('creator').populate('reviews.creator');

  if (story && story._id) {
    const index = story.reviews.findIndex((item) => String(item._id) === reviewId);
    if (index >= 0) {
      story.reviews.splice(index, 1);
    }

    let avgScore = 0;
    if (story.reviews && story.reviews.length > 0) {
      let total = 0;
      story.reviews.forEach((r) => {
        total += r.score;
      });
      avgScore = total / story.reviews.length;
    }
    story.avgScore = avgScore;

    await story.save();
    res.json({
      result: true,
      story,
    });
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// ///////////////////////////////////////////////////////////////////
/// /////////////////////////// Report ////////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getAllReports(req, res) {
  const reports = await Report.find({}, null, { sort: { createdAt: 'asc' } })
    .populate('reporter')
    .populate('reported')
    .populate('story');

  res.json({
    result: true,
    reports,
  });
}

/// ///////////////////////////////////////////////////////////////////
/// /////////////////////////// Question //////////////////////////////
/// ///////////////////////////////////////////////////////////////////
async function getAllQuestions(req, res) {
  const questions = await Question.find({}, null, {
    sort: { createdAt: 'asc' },
  }).populate('creator');

  res.json({
    result: true,
    questions,
  });
}

async function replyQuestion(req, res) {
  const { questionId, reply } = req.body;
  const question = await Question.findById(questionId).populate('creator');
  if (question) {
    question.reply = reply;
    question.save();
    sendReplyEmail(question.name, question.email, reply);
  }
  return res.json({
    result: true,
    question,
  });
}

function sendApproveEmail(username, email) {
  let html = fs.readFileSync('./email_templates/approve_email_template.html', 'utf8');
  html = html.replace('{{username}}', username);

  const mailOptions = {
    from: `${Config.APP_NAME} Admin Support <${Config.ADMIN_EMAIL}>`,
    to: [email],
    subject: Config.APP_NAME + ' Account Approved',
    html,
  };

  mailgunClient.messages
    .create(process.env.MAILGUN_DOMAIN, mailOptions)
    .then((msg) => console.log('Approve Email Sent: ', msg))
    .catch((err) => console.log('Approve Email Failed: ', err));
}

function sendReplyEmail(username, email, reply) {
  let html = fs.readFileSync('./email_templates/reply_email_template.html', 'utf8');
  html = html.replace('{{username}}', username);
  html = html.replace('{{reply}}', reply);

  const mailOptions = {
    from: `${Config.APP_NAME} Admin Support <${Config.ADMIN_EMAIL}>`,
    to: [email],
    subject: Config.APP_NAME + ' Reply Question',
    html,
  };

  mailgunClient.messages
    .create(process.env.MAILGUN_DOMAIN, mailOptions)
    .then((msg) => console.log('Reply Question Email Sent: ', msg))
    .catch((err) => console.log('Reply Question Email Failed: ', err));
}

module.exports = {
  loginMerchant,
  getAllUsers,
  getDashboard,
  changeApproveStatus,

  getActivityData,
  getActivityOfUser,

  getAllStories,
  changeBlockStatus,
  changeFeature,
  removeReview,

  getAllReports,

  getAllQuestions,
  replyQuestion,
  changePinned,
};
