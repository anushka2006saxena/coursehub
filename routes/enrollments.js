const express = require("express");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

const router = express.Router();

// GET /api/enrollments?user=email       -> a student's own enrollments
// GET /api/enrollments?course=courseId  -> everyone enrolled in one course (used for instructor stats)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    if (req.query.course) filter.courseId = req.query.course;

    const enrollments = await Enrollment.find(filter);
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrollments  — enroll a student in a course (simulated payment happens client-side)
router.post("/", async (req, res) => {
  try {
    const { user, courseId } = req.body;
    if (!user || !courseId) {
      return res.status(400).json({ error: "user and courseId are required." });
    }

    const already = await Enrollment.findOne({ user, courseId });
    if (already) return res.status(409).json({ error: "Already enrolled in this course." });

    const enrollment = await Enrollment.create({ user, courseId });
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/enrollments/:id  — update progress %, completion, and/or quiz result
router.patch("/:id", async (req, res) => {
  try {
    const { progress, completed, quizPassed, quizScore } = req.body;
    const update = {};
    if (progress !== undefined) update.progress = progress;
    if (completed !== undefined) update.completed = completed;
    if (quizPassed !== undefined) update.quizPassed = quizPassed;
    if (quizScore !== undefined) update.quizScore = quizScore;

    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrollments/bulk  — instructor pastes a list of student emails to enroll at once
router.post("/bulk", async (req, res) => {
  try {
    const { courseId, emails } = req.body;
    if (!courseId || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "courseId and a non-empty emails array are required." });
    }

    const enrolled = [];
    const skipped = [];

    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;

      const student = await User.findOne({ email, role: "student" });
      if (!student) {
        skipped.push({ email, reason: "No student account found with this email." });
        continue;
      }
      const already = await Enrollment.findOne({ user: email, courseId });
      if (already) {
        skipped.push({ email, reason: "Already enrolled." });
        continue;
      }
      const enrollment = await Enrollment.create({ user: email, courseId });
      enrolled.push(enrollment);
    }

    res.status(201).json({ enrolled, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
