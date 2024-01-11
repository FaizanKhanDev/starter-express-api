const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ActivitySchema = new Schema({
  name: { type: String },
  createdAt: { type: Number },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Export the model
module.exports = mongoose.model("Activity", ActivitySchema);
