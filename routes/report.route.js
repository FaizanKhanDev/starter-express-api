const express = require("express");

const router = express.Router();

const ReportController = require("../controllers/report.controller");
const UserController = require("../controllers/user.controller");
const { catchError } = require("../controllers/error.controller");

router.post(
  "/create",
  UserController.checkAuth,
  catchError(ReportController.create)
);

module.exports = router;
