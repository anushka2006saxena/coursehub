const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  user: { type: String, required: true },       // student's email
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  progress: { type: Number, default: 0 },        // 0–100
  completed: { type: Boolean, default: false },  // true at 100% progress — this alone unlocks the certificate
  quizPassed: { type: Boolean, default: false },  // informational only: did they pass the (optional) quiz — does NOT gate the certificate
  quizScore: { type: Number, default: null },     // last quiz score %, informational
}, { timestamps: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
