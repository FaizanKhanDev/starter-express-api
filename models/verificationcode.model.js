const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const VerificationCode = new Schema({
  type: { type: String },
  createdAt: { type: Date },
  code: { type: String },
  object: { type: String },
  status: { type: Number },
});

// Export the model
module.exports = mongoose.model("verificationcode", VerificationCode);
