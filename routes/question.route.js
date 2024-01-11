const express = require("express");

const router = express.Router();

const QuestionController = require("../controllers/question.controller");
const UserController = require("../controllers/user.controller");
const { catchError } = require("../controllers/error.controller");

router.post(
  "/create",
  UserController.checkAuth,
  catchError(QuestionController.create)
);

module.exports = router;
