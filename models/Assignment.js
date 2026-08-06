const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema({
  input: { type: mongoose.Schema.Types.Mixed, required: true },       // array of arguments
  expectedOutput: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  instructorEmail: { type: String, required: true },
  dueDate: { type: Date, required: true },
  type: { type: String, enum: ["written", "coding"], default: "written" },
  language: { type: String, default: "javascript" },   // only used when type === "coding"
  starterCode: { type: String, default: "" },           // optional boilerplate shown in the editor
  functionName: { type: String, default: "" },           // e.g. "twoSum" — only used for auto-graded JS assignments
  referenceSolution: { type: String, default: "" },      // instructor's own correct code, in `language`
  // JS: testCase.input is an array of function arguments, expectedOutput is the return value.
  // Python/Java: testCase.input is raw stdin text, expectedOutput is the expected stdout text
  // (computed by actually running the reference solution through the Piston execution API).
  testCases: { type: [testCaseSchema], default: [] },
  autoGraded: { type: Boolean, default: false },          // true when a reference solution + test cases were provided
}, { timestamps: true });

module.exports = mongoose.model("Assignment", assignmentSchema);
