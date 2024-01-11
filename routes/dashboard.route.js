const express = require("express");

const router = express.Router();
const UserController = require("../controllers/user.controller");
const DashboardController = require("../controllers/dashboard.controller");
const { catchError } = require("../controllers/error.controller");

router.post("/login_merchant", catchError(DashboardController.loginMerchant));
router.post(
  "/change_approve_status",
  UserController.checkAuth,
  catchError(DashboardController.changeApproveStatus)
);
router.post(
  "/get_dashboard",
  UserController.checkAuth,
  catchError(DashboardController.getDashboard)
  );
router.post(
  "/get_all_users",
  UserController.checkAuth,
  catchError(DashboardController.getAllUsers)
  );

router.post(
  "/get_all_stories",
  UserController.checkAuth,
  catchError(DashboardController.getAllStories)
  );
  
router.post(
  "/change_block_status",
  UserController.checkAuth,
  catchError(DashboardController.changeBlockStatus)
);
router.post(
  "/change_feature",
  UserController.checkAuth,
  catchError(DashboardController.changeFeature)
);
router.post(
  "/change_pinned",
  UserController.checkAuth,
  catchError(DashboardController.changePinned)
);
router.post(
  "/remove_review",
  UserController.checkAuth,
  catchError(DashboardController.removeReview)
);

router.post(
  "/get_all_questions",
  UserController.checkAuth,
  catchError(DashboardController.getAllQuestions)
);
router.post(
  "/reply_question",
  UserController.checkAuth,
  catchError(DashboardController.replyQuestion)
);

router.post(
  "/get_all_reports",
  UserController.checkAuth,
  catchError(DashboardController.getAllReports)
);

router.post(
  "/get_activity_data",
  UserController.checkAuth,
  catchError(DashboardController.getActivityData)
);
router.post(
  "/get_activity_of_user",
  UserController.checkAuth,
  catchError(DashboardController.getActivityOfUser)
);



module.exports = router;
