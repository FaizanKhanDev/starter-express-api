const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StorySchema = new Schema({
  votes: [
    {
      creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vote: { type: Number, required: true}, 
      createdAt: { type: Number, default: new Date() },
    },
  ],
  isPinned: { type: Boolean, default: false },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String },
  type: { type: String },
  tags: { type: Array },
  description: { type: String },
  thumbnail: { type: String },
  deviceInfo: {
    width: { type: Number },
    height: { type: Number },
  },
  slideCount: { type: Number },
  orientation: { type: String, default: 'landscape' },
  slides: [
    {
      texts: [
        {
          text: { type: String },
          outline: { type: Boolean },
          fontName: { type: String },
          fontFamily: { type: String },
          fontSize: { type: Number },
          textAlign: { type: String },
          fontBold: { type: Boolean, default: false },
          fontItalic: { type: Boolean, default: false },
          fontUnderline: { type: Boolean, default: false },
          color: { type: String },
          pos: {
            x: { type: Number },
            y: { type: Number },
            width: { type: Number },
            height: { type: Number },
          },
        },
      ],
      type: { type: String },
      order: { type: Number },
      title: { type: String },
      background: { type: String },
      // thumbnail: { type: String },
      // thumbnailSize: { type: Object },
      createdAt: { type: Number, default: new Date() },
    },
  ],
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Number, default: new Date() },
  reviews: [
    {
      creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      score: { type: Number },
      createdAt: { type: Number },
    },
  ],
  avgScore: { type: Number, default: 0 },
  // voting Counter
  avgVote: { type: Number, default: 0 },
  likes: [
    {
      creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Number },
    },
  ],
  saved: [
    {
      creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Number },
    },
  ],
  viewers: [],
  comments: [
    {
      createdAt: Number,
      creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: String,
      likes: [
        {
          createdAt: Number,
          creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      replies: [
        {
          createdAt: Number,
          creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          message: String,
        },
      ],
    },
  ],
  isBlocked: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
});

// Export the model
module.exports = mongoose.model('Story', StorySchema);
