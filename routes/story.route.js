const express = require("express");

const router = express.Router();

const StoryController = require("../controllers/story.controller");
const UserController = require("../controllers/user.controller");
const { catchError } = require("../controllers/error.controller");

router.post(
  "/create",
  UserController.checkAuth,
  catchError(StoryController.createStory)
);
router.post(
  "/edit",
  UserController.checkAuth,
  catchError(StoryController.editStory)
);
router.post(
  "/remove",
  UserController.checkAuth,
  catchError(StoryController.removeStory)
);

router.post(
  "/like",
  UserController.checkAuth,
  catchError(StoryController.like)
);
router.post(
  "/save",
  UserController.checkAuth,
  catchError(StoryController.save)
);
router.post(
  "/get_detail",
  UserController.checkAuth,
  catchError(StoryController.getDetail)
);
router.post(
  "/submit_rating",
  UserController.checkAuth,
  catchError(StoryController.submitRating)
);


router.post(
  "/set_vote",
  UserController.checkAuth,
  catchError(StoryController.setVote)
);


router.post(
  "/comment",
  UserController.checkAuth,
  catchError(StoryController.commentStory)
);
router.post(
  "/like_comment",
  UserController.checkAuth,
  catchError(StoryController.likeComment)
);
router.post(
  "/reply_comment",
  UserController.checkAuth,
  catchError(StoryController.replyComment)
);

router.post(
  "/get_my_list",
  UserController.checkAuth,
  catchError(StoryController.getMyList)
);
router.post(
  "/get_subs",
  UserController.checkAuth,
  catchError(StoryController.getSubs)
);
router.post(
  "/get_arena",
  UserController.checkAuth,
  catchError(StoryController.getArena)
);
router.post(
  "/get_featured",
  UserController.checkAuth,
  catchError(StoryController.getFeatured)
);
router.post(
  "/get_home",
  UserController.checkAuth,
  catchError(StoryController.getHome)
);
router.post(
  "/search",
  UserController.checkAuth,
  catchError(StoryController.search)
);
router.post(
  "/get_group",
  UserController.checkAuth,
  catchError(StoryController.getGroup)
);


module.exports = router;
