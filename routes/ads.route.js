const express = require("express");

const router = express.Router();

const AdsController = require("../controllers/ads.controller");
const UserController = require("../controllers/user.controller");
const { catchError } = require("../controllers/error.controller");

router.post("/add", UserController.checkAuth, catchError(AdsController.add));
router.post("/edit", UserController.checkAuth, catchError(AdsController.edit));
router.post(
  "/remove",
  UserController.checkAuth,
  catchError(AdsController.remove)
);

router.post(
  "/get_all",
  UserController.checkAuth,
  catchError(AdsController.getAll)
);
router.post(
  "/check-ads",
  UserController.checkAuth,
  catchError(AdsController.checkAds)
);

module.exports = router;
