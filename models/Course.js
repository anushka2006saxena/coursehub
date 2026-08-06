const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema({
  q: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: Number, required: true }, // index of the correct option
}, { _id: false });

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, default: "" }, // e.g. /uploads/videos/xyz.mp4, or a pasted URL
}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  instructor: { type: String, required: true },       // display name
  instructorEmail: { type: String },                   // links back to a User
  chapters: { type: [chapterSchema], default: [] },
  quiz: { type: [quizQuestionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
