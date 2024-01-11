/* eslint-disable import/extensions */
const Report = require('../models/report.model');
const User = require('../models/user.model');
const Messages = require('../config/messages.js');

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////////// Create /////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function create(req, res) {
  const { type, reporter, reported, story, category, message } = req.body;
  const r = new Report();
  r.type = type;
  r.createdAt = Date.now();
  r.reporter = reporter;
  r.category = category;
  r.message = message;

  const user = await User.findById(reporter);
  if (user) {
    if (story) {
      r.story = story;
      if (user.blockedStories && user.blockedStories.indexOf(story) < 0) {
        user.blockedStories.push(story);
      }
    }

    if (reported) {
      r.reported = reported;
      if (user.blockedUsers && user.blockedUsers.indexOf(reported) < 0) {
        user.blockedUsers.push(reported);
      }
    }

    await user.save();
    await r.save();
    res.json({
      result: true,
      type,
      reported,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ACCOUNT_NOT_EXIST,
    });
  }
}

module.exports = {
  create,
};
