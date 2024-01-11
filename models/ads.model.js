const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AdsSchema = new Schema({
  title: { type: String },
  mediaType: { type: String },
  mediaSrc: { type: String },
  thumbnail: { type: String },
  thumbnailSize: { type: Object },
  link: { type: String },
  totalShows: { type: Number, default: 0 },
  totalClicks: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now() },
});

// Export the model
module.exports = mongoose.model("Ads", AdsSchema);
