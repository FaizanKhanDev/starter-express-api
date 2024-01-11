const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  type: { type: String }, // story_report, user_report
  story: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reported: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: { type: String },
  message: { type: String },
  createdAt: { type: Number, default: Date.now() },
  answer: { type: String },
  answeredAt: { type: Number },
});

// Export the model
module.exports = mongoose.model("Report", ReportSchema);
