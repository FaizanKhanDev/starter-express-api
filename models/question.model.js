const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const QuestionSchema = new Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String },
  email: { type: String },
  message: { type: String },
  reply: { type: String },
  createdAt: { type: Number, default: Date.now() },
});

// Export the model
module.exports = mongoose.model("Question", QuestionSchema);
