/* eslint-disable import/extensions */
const Messages = require('../config/messages.js');

const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');

// models.
const Story = require('../models/story.model');
const Subscribe = require('../models/subscribe.model.js');

// controller.
const NotificationController = require('./notification.controller');

const {
  POST_SORT_TYPE,
  NOTIFICATION_TYPE,
  STORY_CATEGORY
} = require('../config/constants');

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

/// //////////////////////////////////////////////////////////////////////
/// //////////////////// Create Story ////////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function createStory(req, res) {
  upload(req, res, async () => {
    const story = JSON.parse(req.body.story);
    const slideCount = req.body.slideCount;
    const orientation = req.body.orientation;
    const _story = new Story({
      creator: story.creator,
      title: story.title,
      type: story.type,
      tags: story.tags,
      description: story.description,
      deviceInfo: story.deviceInfo,
      slideCount,
      orientation,
      createdAt: Date.now(),
    });

    const savedStory = await _story.save();
    const storyId = savedStory._id;
    const slides = [];
    for (let i = 0; i < Number(slideCount); i++) {
      let background = req.body['background_' + i];
      if (req.files && req.files.length > 0) {
        const backgroundIndex = req.files.findIndex((item) => item.fieldname === 'background_' + i);
        if (backgroundIndex >= 0) {
          background = req.files[backgroundIndex].location;
        }
      }
      const type = req.body['type_' + i];
      const title = req.body['title_' + i];
      const order = req.body['order_' + i];
      const texts = req.body['texts_' + i] ? JSON.parse(req.body['texts_' + i]) : [];

      slides.push({
        background,
        title,
        order,
        texts,
        type,
      });
    }

    await Story.updateOne({ _id: storyId }, { $set: { slides } });

    const createdStory = await Story.findOne({ _id: storyId }).populate('creator');
    return res.json({
      result: true,
      story: createdStory,
    });
  });
}


/// //////////////////////////////////////////////////////////////////////
/// //////////////////// Edit Story //////////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function editStory(req, res) {
  upload(req, res, async () => {
    const story = JSON.parse(req.body.story);
    const slideCount = req.body.slideCount;
    const orientation = req.body.orientation;
    await Story.updateOne(
      { _id: story._id },
      {
        $set: {
          title: story.title,
          type: story.type,
          tags: story.tags,
          description: story.description,
          deviceInfo: story.deviceInfo,
          slideCount,
          orientation,
        },
      }
    );
    const storyId = story._id;
    const slides = [];
    for (let i = 0; i < Number(slideCount); i++) {
      let background = req.body['background_' + i];
      if (req.files && req.files.length > 0) {
        const backgroundIndex = req.files.findIndex((item) => item.fieldname === 'background_' + i);
        if (backgroundIndex >= 0) {
          background = req.files[backgroundIndex].location;
        }
      }

      const type = req.body['type_' + i];
      const title = req.body['title_' + i];
      const order = req.body['order_' + i];
      const texts = req.body['texts_' + i] ? JSON.parse(req.body['texts_' + i]) : [];

      slides.push({
        background,
        title,
        order,
        texts,
        type
      });
    }
    await Story.updateOne({ _id: storyId }, { $set: { slides } });

    const updatedStory = await Story.findOne({ _id: storyId })
      .populate('creator')
      .populate('comments.creator')
      .populate('comments.likes.creator')
      .populate('comments.replies.creator');

    return res.json({
      result: true,
      story: updatedStory,
    });
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ////////////////////// Remove Story //////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function removeStory(req, res) {
  Story.deleteOne({ _id: req.body.storyId })
    .then(() => {
      res.json({
        result: true,
        story: req.body.storyId,
      });
    })
    .catch((err) => {
      res.json({
        result: false,
        error: err.message,
      });
    });
}

/// //////////////////////////////////////////////////////////////////////
/// /////////////////////// Like Story. //////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function like(req, res) {
  const { storyId } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId)
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  if (story) {
    const index = story.likes.findIndex((item) => String(item.creator) === String(currentUser._id));
    if (index >= 0) {
      story.likes.splice(index, 1);
    } else {
      story.likes.push({
        creator: currentUser._id,
        createdAt: Date.now(),
      });
    }
    await story.save();
    return res.json({
      result: true,
      story,
    });
  } else {
    return res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}


/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Up Vote  / Down Field /////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function setVote(req, res) {
  try {
    // get Story Id and Vote 
    // Note: vote can be 1 or -1
    const { storyId, vote } = req.body;
    const { currentUser } = req;

  // get Story By Id
    const story = await Story.findById(storyId);
    // if Story Found
    if (story) {
      // check if user has already voted
      const existingVoteIndex = story.votes.findIndex((item) =>
        String(item.creator) === String(currentUser._id));
      
      // if user has already voted, update vote
      if (existingVoteIndex != -1) {

        // User has already voted, update vote
        story.votes[existingVoteIndex].vote = vote;
      }
      else {
        // User has not voted yet, add a new vote
        story.votes.push({
          creator: currentUser._id,
          vote,
          createdAt: Date.now(),
        });
      }

      // calculate total votes 
       let totalVotes =  story.votes.reduce((accumulator, currentVote) => accumulator + currentVote.vote, 0);
      //  Update avgVote
      story.avgVote = totalVotes;
  
      // save Story
      await story.save();

      return res.json({
        result: true,
        story,
      });
    } else {
      return res.status(404).json({
        result: false,
        message: "Story not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      result: false,
      message: "Internal server error",
    });
  }
}






/// //////////////////////////////////////////////////////////////////////
/// /////////////////////// Save Story. //////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function save(req, res) {
  const { storyId } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId)
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  if (story) {
    const index = story.saved.findIndex((item) => String(item.creator) === String(currentUser._id));
    if (index >= 0) {
      story.saved.splice(index, 1);
    } else {
      story.saved.push({
        creator: currentUser._id,
        createdAt: Date.now(),
      });
    }
   x
    await story.save();

    return res.json({
      result: true,
      story,
    });
  } else {
    return res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
///////////////////////// Get Story Detail. /////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getDetail(req, res) {
  const { storyId, increaseViewCount } = req.body;
  const story = await Story.findById(storyId)
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  if (story) {
    if (increaseViewCount) {
      story.viewCount++;
      if (!story.viewers.includes(String(req.currentUser._id))) {
        story.viewers.push(req.currentUser._id);
      }
      await story.save();
    }

    return res.json({
      result: true,
      story,
    });
  } else {
    return res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
//////////////////////////// Comment Story //////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function commentStory(req, res) {
  const { storyId, message } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId);
  if (story) {
    const comments = story.comments ? story.comments : [];
    comments.push({
      createdAt: Date.now(),
      creator: currentUser._id,
      message,
    });

    // Send notification.
    if (String(currentUser._id) !== String(story.creator)) {
      NotificationController.create({
        type: NOTIFICATION_TYPE.COMMNET_STORY,
        creator: currentUser._id,
        receiver: story.creator,
        story: story._id,
      });
    }

    await story.save();
    const _story = await Story.findById(story)
      .populate('creator')
      .populate('comments.creator')
      .populate('comments.likes.creator')
      .populate('comments.replies.creator');

    res.json({
      result: true,
      story: _story,
    });
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Like Comment ///////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function likeComment(req, res) {
  const { storyId, commentId } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId);

  if (story) {
    var comments = story.comments ? story.comments : [];
    const commentIndex = comments.findIndex((item) => item._id && item._id.toString() === commentId);
    if (commentIndex >= 0) {
      const likes = comments[commentIndex].likes || [];
      const likeIndex = likes.findIndex((item) => item.creator && String(item.creator) === String(currentUser._id));
      if (likeIndex >= 0) {
        likes.splice(likeIndex, 1);
      } else {
        likes.push({
          creator: currentUser._id,
          createdAt: Date.now(),
        });
      }
      await story.save();
      const _story = await Story.findById(storyId)
        .populate('creator')
        .populate('comments.creator')
        .populate('comments.likes.creator')
        .populate('comments.replies.creator');

      res.json({
        result: true,
        story: _story,
      });
    } else {
      res.json({
        result: false,
        error: Messages.COMMENT_NOT_EXIST,
      });
    }
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Reply Comment //////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function replyComment(req, res) {
  const { storyId, commentId, message } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId);

  if (story) {
    var comments = story.comments ? story.comments : [];
    const commentIndex = comments.findIndex((item) => item._id && String(item._id) === String(commentId));
    if (commentIndex >= 0) {
      const comment = comments[commentIndex];
      const replies = comment.replies || [];
      replies.push({
        creator: currentUser._id,
        message,
        createdAt: Date.now(),
      });

      // Send notification.
      if (String(currentUser._id) !== String(comment.creator)) {
        NotificationController.create({
          type: NOTIFICATION_TYPE.REPLIED_COMMENT_STORY,
          creator: currentUser._id,
          receiver: comment.creator,
          story: storyId,
        });
      }

      await story.save();
      const _story = await Story.findById(storyId)
        .populate('creator')
        .populate('comments.creator')
        .populate('comments.likes.creator')
        .populate('comments.replies.creator');

      res.json({
        result: true,
        story: _story,
      });
    } else {
      res.json({
        result: false,
        error: Messages.COMMENT_NOT_EXIST,
      });
    }
  } else {
    res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/// //////////////////////////////////////////////////////////////////////
/// /////////////////////// Submit Rating. ///////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function submitRating(req, res) {
  const { storyId, score } = req.body;
  const { currentUser } = req;
  const story = await Story.findById(storyId)
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  if (story) {
    story.reviews.push({
      creator: currentUser._id,
      score,
      createdAt: Date.now(),
    });
    let avgScore = 0;
    let total = 0;
    story.reviews.forEach((r) => {
      total += r.score;
    });
    avgScore = total / story.reviews.length;
    story.avgScore = avgScore;

    await story.save();
    return res.json({
      result: true,
      story,
    });
  } else {
    return res.json({
      result: false,
      error: Messages.STORY_NOT_EXIST,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
//////////////////////// Get My Stories. ////////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getMyList(req, res) {
  const { currentUser } = req;
  const stories = await Story.find({
    creator: currentUser._id, isBlocked: false
  })
    .sort({ createdAt: 'desc' })
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator')
    .exec();

  return res.json({
    result: true,
    stories,
  });
}

/////////////////////////////////////////////////////////////////////////
//////////////////////// Get Subscribed Stories. ////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getSubs(req, res) {
  const { limit, offset } = req.body;
  const { currentUser } = req;
  const blockedUsers = currentUser && currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser && currentUser.blockedStories ? currentUser.blockedStories : [];

  const list = await Subscribe.find({ subscriber: currentUser._id })
    .populate('user');

  let subscriptions = [];
  let ids = [];
  if (list && list.length > 0) {
    list.forEach((item) => {
      if (!blockedUsers.includes(item.user._id)) {
        ids.push(item.user._id);
        subscriptions.push(item.user);
      }
    });
  }
  const stories = await Story.find(
    {
      creator: { $in: ids },
      _id: { $nin: blockedStories },
      isBlocked: false,
    },
    null,
    { sort: { createdAt: 'desc' } }
  )
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  return res.json({
    result: true,
    stories,
    subscriptions,
  });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////// Get Group Stories. //////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getGroup(req, res) {
  const { currentUser } = req;
  const {
    category,
    limit,
    offset,
    type,
    sort,
  } = req.body;

  const blockedUsers = currentUser && currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser && currentUser.blockedStories ? currentUser.blockedStories : [];

  let subscriptions = [];
  let filters = {
    isBlocked: false,
  };
  if (blockedUsers && blockedUsers.length > 0) {
    filters['creator'] = { $nin: blockedUsers };
  }
  if (blockedStories && blockedStories.length > 0) {
    filters['_id'] = { $nin: blockedStories };
  }

  if (category === STORY_CATEGORY.FEATURED) {
    filters['featured'] = true;
  } else if (category === STORY_CATEGORY.SUBS) {
    const list = await Subscribe.find({ subscriber: currentUser._id })
      .populate('user');

    const ids = [];
    if (list && list.length > 0) {
      list.forEach((item) => {
        if (!blockedUsers.includes(item.user._id)) {
          ids.push(item.user._id);
        }
        subscriptions.push(item.user);
      });
      filters['creator'] = { $in: ids };
    }
  }

  if (type && type.length > 0) {
    filters['type'] = type;
  }

  let sortData = { createdAt: 'desc' };
  if (sort && sort.length > 0) {
    if (sort === POST_SORT_TYPE.NEW) {
      sortData = { createdAt: 'desc' };
    } else if (sort === POST_SORT_TYPE.TOP_RATED) {
      sortData = { avgScore: 'desc' };
    } else if (sort === POST_SORT_TYPE.MOST_VIEWED) {
      sortData = { viewCount: 'desc' };
    }
  }

  const stories = await Story.find(filters)
    .sort(sortData)
    .limit(limit)
    .skip(offset)
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator')
    .exec();

  return res.json({
    result: true,
    stories,
    subscriptions,
  });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////// Get ARENA Stories. //////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getArena(req, res) {
  const { limit, offset, type, sort } = req.body;
  // Note: Sort can Top, New, Hot or None

  const { currentUser } = req;
  const blockedUsers = currentUser && currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser && currentUser.blockedStories ? currentUser.blockedStories : [];


  const filters = {
    creator: { $nin: blockedUsers },
    _id: { $nin: blockedStories },
    isBlocked: false,
  };

  // if Type in req.body then add in its filters
  if (type) {
    filters['type'] = type;
  }

  // if Sort in req.body then add in its filters
  let sortCriteria;
  switch (sort) {
    case 'TOP':
      sortCriteria = { avgScore: -1, createdAt: 1 }; // Sorting by highest average score and oldest content
      break;
    case 'NEW':
      sortCriteria = { createdAt: -1 }; // Sorting by newest content
      break;
    case 'HOT':
      sortCriteria = { viewCount: -1 }; // Sorting by view count
      break;
    default:
      // Handle unknown type or define a default sorting
      break;
  }

  // if Sort in req.body then add in its filters
  if (sort && sortCriteria) {
    filters['sort'] = sortCriteria;
  }

  const stories = await Story.find(filters)
    .sort({ createdAt: 'desc' })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  return res.json({
    result: true,
    stories,
  });
}

/////////////////////////////////////////////////////////////////////////
//////////////////////// Get Featured Stories. //////////////////////////
/////////////////////////////////////////////////////////////////////////
async function getFeatured(req, res) {
  const { offset, limit } = req.body;
  const { currentUser } = req;
  const blockedUsers = currentUser && currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser && currentUser.blockedStories ? currentUser.blockedStories : [];

  const stories = await Story.find(
    {
      creator: { $nin: blockedUsers },
      _id: { $nin: blockedStories },
      isBlocked: false,
      featured: true,
    },
    null,
    { sort: { avgScore: 'desc' } }
  )
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  return res.json({
    result: true,
    stories,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Get Home Stories. //////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function getHome(req, res) {
  const { currentUser } = req;
  const blockedUsers = currentUser && currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser && currentUser.blockedStories ? currentUser.blockedStories : [];

  const liked = await Story.find({
    'likes.creator': currentUser._id,
    creator: { $nin: blockedUsers },
    _id: { $nin: blockedStories },
    isBlocked: false,
  })
    .sort({ createdAt: 'desc' })
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  const saved = await Story.find({
    'saved.creator': currentUser._id,
    creator: { $nin: blockedUsers },
    _id: { $nin: blockedStories },
    isBlocked: false,
  })
    .sort({ createdAt: 'desc' })
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  const recent = await Story.find({
    creator: { $nin: blockedUsers },
    _id: { $nin: blockedStories },
    isBlocked: false,
  })
    .sort({ createdAt: 'desc' })
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator')
    .limit(5);

  return res.json({
    result: true,
    liked,
    saved,
    recent,
  });
}

/////////////////////////////////////////////////////////////////////////
////////////////////////// Search Stories. //////////////////////////////
/////////////////////////////////////////////////////////////////////////
async function search(req, res) {
  const { filter, limit, offset } = req.body;

  const { currentUser } = req;
  currentUser.searchFilter = filter;
  await currentUser.save();

  const blockedUsers = currentUser.blockedUsers ? currentUser.blockedUsers : [];
  const blockedStories = currentUser.blockedStories ? currentUser.blockedStories : [];

  let filterData = {};

  // Keyword.
  if (filter.keyword && filter.keyword.length > 0) {
    filterData = {
      $or: [
        { title: { $regex: filter.keyword, $options: 'i' } },
        { description: { $regex: filter.keyword, $options: 'i' } },
        { tags: { $regex: filter.keyword, $options: 'i' } },
        { type: { $regex: filter.keyword, $options: 'i' } },
      ],
    };
  }

  // Block.
  filterData['isBlocked'] = false;
  if (blockedUsers && blockedUsers.length > 0) {
    filterData['creator'] = { $nin: blockedUsers };
  }
  if (blockedStories && blockedStories.length > 0) {
    filterData['_id'] = { $nin: blockedStories };
  }

  const stories = await Story.find(filterData)
    .sort({ createdAt: 'desc' })
    .skip(parseInt(offset))
    .limit(parseInt(limit))
    .populate('creator')
    .populate('comments.creator')
    .populate('comments.likes.creator')
    .populate('comments.replies.creator');

  return res.json({
    result: true,
    stories,
  });
}

module.exports = {
  createStory,
  editStory,
  removeStory,
  like,
  save,
  getDetail,
  commentStory,
  likeComment,
  replyComment,
  submitRating,

  getMyList,
  getGroup,
  getSubs,
  getArena,
  getFeatured,
  getHome,
  search,
  setVote,

};
