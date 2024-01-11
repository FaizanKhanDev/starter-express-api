const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ChannelSchema = new Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Number, default: Date.now() },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  lastRead: [{
    userId: String,
    message: String,
  }],
});

module.exports = mongoose.model("Channel", ChannelSchema);
