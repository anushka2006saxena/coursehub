const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  studentEmail: { type: String, required: true },
  content: { type: String, required: true },   // write-up / notes, or code for coding assignments
  link: { type: String, default: "" },          // optional GitHub / drive link
  grade: { type: Number, default: null },        // instructor fills this in later (or auto-set to 100 if auto-graded)
  feedback: { type: String, default: "" },
  autoGraded: { type: Boolean, default: false },
  testResults: { type: mongoose.Schema.Types.Mixed, default: [] }, // per-test-case pass/fail, for instructor review
}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);
