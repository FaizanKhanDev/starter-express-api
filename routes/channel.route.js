const express = require("express");

const router = express.Router();

const UserController = require("../controllers/user.controller");
const ChannelController = require("../controllers/channel.controller");
const { catchError } = require("../controllers/error.controller");

router.get("/get", UserController.checkAuth, catchError(ChannelController.get));
router.get("/get_my_list", UserController.checkAuth, catchError(ChannelController.getMyList));
router.get("/get_messages", UserController.checkAuth, catchError(ChannelController.getMessages));
router.post("/send_message", UserController.checkAuth, catchError(ChannelController.sendMessage));
router.post("/leave", UserController.checkAuth, catchError(ChannelController.leave));
router.delete("/delete", UserController.checkAuth, catchError(ChannelController.deleteChannel));

module.exports = router;
