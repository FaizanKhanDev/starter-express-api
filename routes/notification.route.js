const express = require("express");

const router = express.Router();

const UserController = require("../controllers/user.controller");
const NotificationController = require("../controllers/notification.controller");
const { catchError } = require("../controllers/error.controller");

router.post(
  "/get_my_list",
  UserController.checkAuth,
  catchError(NotificationController.getMyList)
);
router.post(
  "/mark_read",
  UserController.checkAuth,
  catchError(NotificationController.markRead)
);
router.post(
  "/get_unread_number",
  UserController.checkAuth,
  catchError(NotificationController.getUnreadNumber)
);
router.post(
  "/mark_read_all",
  UserController.checkAuth,
  catchError(NotificationController.markAsReadAll)
);
router.post(
  "/remove_all",
  UserController.checkAuth,
  catchError(NotificationController.removeAll)
);

module.exports = router;
