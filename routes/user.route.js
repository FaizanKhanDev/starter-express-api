const express = require("express");

const router = express.Router();
const UserController = require("../controllers/user.controller");
const { catchError } = require("../controllers/error.controller");

router.post("/login", catchError(UserController.login));
router.post("/login_with_social", catchError(UserController.loginWithSocial));
router.post("/register", catchError(UserController.register));
router.post("/check_email", catchError(UserController.checkEmail));
router.post("/forgot_password", catchError(UserController.forgotPassword));
router.post("/verify_resetcode", catchError(UserController.verifyResetCode));
router.post("/reset_newpassword", catchError(UserController.resetNewPassword));

router.post(
  "/get_user",
  UserController.checkAuth,
  catchError(UserController.getUser)
);
router.post(
  "/update_profile",
  UserController.checkAuth,
  catchError(UserController.updateProfile)
);
router.post(
  "/change_password",
  UserController.checkAuth,
  catchError(UserController.changePassword)
);
router.post(
  "/delete_account",
  UserController.checkAuth,
  catchError(UserController.deleteAccount)
);
router.post(
  "/get_global_data",
  UserController.checkAuth,
  catchError(UserController.getGlobalData)
);
router.post(
  "/update_device_data",
  UserController.checkAuth,
  catchError(UserController.updateDeviceData)
);
router.post(
  "/subscribe",
  UserController.checkAuth,
  catchError(UserController.subscribe)
);
router.get(
  "/get_subscribers",
  UserController.checkAuth,
  catchError(UserController.getSubscribers)
);
router.get(
  "/get_subscriptions",
  UserController.checkAuth,
  catchError(UserController.getSubscriptions)
);

router.post(
  "/block",
  UserController.checkAuth,
  catchError(UserController.block)
);
router.post(
  "/get_profile_detail",
  UserController.checkAuth,
  catchError(UserController.getProfileDetail)
);

module.exports = router;
