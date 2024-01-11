const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  story: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  createdAt: { type: Number, default: Date.now() },
  type: { type: String },
  isRead: { type: Boolean, default: false },
  message: { type: String },
});

// Export the model
module.exports = mongoose.model("Notification", NotificationSchema);
