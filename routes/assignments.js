const express = require("express");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const { runTestCases, runTestCasesStdio } = require("../utils/runCode");

// Helper: run a set of test cases against `code`, in whichever style the
// assignment's language needs (JS = direct function call, Python/Java = stdio).
async function gradeCode(assignment, code) {
  if (assignment.language === "javascript") {
    return runTestCases(code, assignment.functionName, assignment.testCases);
  }
  return runTestCasesStdio(assignment.language, code, assignment.testCases);
}

const router = express.Router();

// GET /api/assignments?course=id        -> assignments for one course (students see this)
// GET /api/assignments?instructor=email -> assignments created by one instructor
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.course) filter.courseId = req.query.course;
    if (req.query.instructor) filter.instructorEmail = req.query.instructor;
    const assignments = await Assignment.find(filter).sort({ dueDate: 1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id  -> single assignment (used by the LeetCode-style solve page)
router.get("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });
    res.json(assignment);
  } catch (err) {
    res.status(404).json({ error: "Assignment not found." });
  }
});

// POST /api/assignments  — instructor/admin creates a new assignment
// If it's a JS coding assignment with a reference solution + test case inputs,
// we run the reference solution ourselves to compute each expected output —
// the instructor never has to type expected answers by hand.
router.post("/", async (req, res) => {
  try {
    const {
      title, description, courseId, instructorEmail, dueDate,
      type, language, starterCode, functionName, referenceSolution, testCaseInputs,
    } = req.body;

    if (!title || !description || !courseId || !instructorEmail || !dueDate) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const isCoding = type === "coding";
    const lang = language || "javascript";
    let testCases = [];
    let autoGraded = false;

    if (isCoding && lang === "javascript" && functionName && referenceSolution && Array.isArray(testCaseInputs) && testCaseInputs.length > 0) {
      // JS: instructor gives argument lists, we call their reference function directly.
      const results = runTestCases(referenceSolution, functionName, testCaseInputs.map(input => ({ input, expectedOutput: null })));
      const failed = results.find(r => !r.error ? false : true);
      if (failed && failed.error) {
        return res.status(400).json({ error: `Your reference solution failed on a test case: ${failed.error}` });
      }
      testCases = results.map(r => ({ input: r.input, expectedOutput: r.actualOutput }));
      autoGraded = true;
    } else if (isCoding && (lang === "python" || lang === "java") && referenceSolution && Array.isArray(testCaseInputs) && testCaseInputs.length > 0) {
      // Python/Java: instructor gives stdin text per test case, we actually run their
      // reference solution (via Piston) to capture real stdout as the expected output.
      const results = await runTestCasesStdio(lang, referenceSolution, testCaseInputs.map(input => ({ input, expectedOutput: null })));
      const failed = results.find(r => r.error);
      if (failed && failed.error) {
        return res.status(400).json({ error: `Your reference solution failed on a test case: ${failed.error}` });
      }
      testCases = results.map(r => ({ input: r.input, expectedOutput: r.actualOutput }));
      autoGraded = true;
    }

    const assignment = await Assignment.create({
      title, description, courseId, instructorEmail, dueDate,
      type: isCoding ? "coding" : "written",
      language: language || "javascript",
      starterCode: starterCode || "",
      functionName: functionName || "",
      referenceSolution: referenceSolution || "",
      testCases,
      autoGraded,
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/:id/run  — student runs their code against the test cases WITHOUT submitting
router.post("/:id/run", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });
    if (!assignment.autoGraded) return res.status(400).json({ error: "This assignment isn't auto-graded." });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code is required." });

    const results = await gradeCode(assignment, code);
    const allPassed = results.every(r => r.passed);
    res.json({ results, allPassed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/:id/submissions   -> all submissions for one assignment (instructor view)
router.get("/:id/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.id }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assignments/:id/submissions  — student submits their work
// For auto-graded coding assignments, the code is re-run against every test case
// server-side first; if any test fails, the submission is rejected outright.
router.post("/:id/submissions", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found." });

    const { studentEmail, content, link } = req.body;
    if (!studentEmail || !content) {
      return res.status(400).json({ error: "studentEmail and content are required." });
    }

    let testResults = [];
    if (assignment.autoGraded) {
      testResults = await gradeCode(assignment, content);
      const allPassed = testResults.every(r => r.passed);
      if (!allPassed) {
        return res.status(400).json({
          error: "Your code didn't pass all the test cases, so it wasn't submitted. Fix it and try again.",
          testResults,
        });
      }
    }

    const existing = await Submission.findOne({ assignmentId: req.params.id, studentEmail });
    if (existing) {
      existing.content = content;
      existing.link = link || "";
      existing.testResults = testResults;
      existing.autoGraded = assignment.autoGraded;
      if (assignment.autoGraded) existing.grade = 100; // provably correct — full marks, instructor can still adjust
      await existing.save();
      return res.json(existing);
    }
    const submission = await Submission.create({
      assignmentId: req.params.id, studentEmail, content, link: link || "",
      testResults, autoGraded: assignment.autoGraded,
      grade: assignment.autoGraded ? 100 : null,
    });
    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assignments/submissions/mine?student=email  -> a student's own submissions (to show status across all assignments)
router.get("/submissions/mine", async (req, res) => {
  try {
    const submissions = await Submission.find({ studentEmail: req.query.student });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/assignments/submissions/:id  — instructor grades a submission
router.patch("/submissions/:id", async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const update = {};
    if (grade !== undefined) update.grade = grade;
    if (feedback !== undefined) update.feedback = feedback;
    const submission = await Submission.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
