const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  type: { type: String, default: "user" }, // user, admin
  avatar: { type: String },
  name: { type: String },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  socialType: { type: String }, // facebook, twitter, google
  socialId: { type: String },
  iOSDeviceToken: { type: String },
  androidDeviceToken: { type: String },
  createdAt: { type: Number, default: Date.now() },
  isPublished: { type: Boolean, default: false },
  geolocation: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  searchFilter: {
    keyword: { type: String },
    types: [],
    slideMin: { type: String },
    slideMax: { type: String },
    minmumRating: { type: String },
    tags: { type: String },
  },
  blockedStories: [],
  blockedUsers: [],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Number },
});

UserSchema.index({ geolocation: "2dsphere" });

// Export the model
module.exports = mongoose.model("User", UserSchema);
