const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubscribeSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Number },
});

// Export the model
module.exports = mongoose.model("Subscribe", SubscribeSchema);
