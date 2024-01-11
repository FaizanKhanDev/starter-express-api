const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  type: String, // text, photo
  channel: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String },
  width: { type: Number },
  height: { type: Number },
  createdAt: { type: Number, default: Date.now() },
});

module.exports = mongoose.model("Message", MessageSchema);
