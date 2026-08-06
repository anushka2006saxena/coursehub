const express = require("express");
const Course = require("../models/Course");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");

const router = express.Router();

// GET /api/courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found." });
    res.json(course);
  } catch (err) {
    res.status(404).json({ error: "Course not found." });
  }
});

// GET /api/courses/instructor/:email  — courses published by one instructor
router.get("/instructor/:email", async (req, res) => {
  try {
    const courses = await Course.find({ instructorEmail: req.params.email });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses  — instructor publishes a new course with their own chapters + optional quiz
router.post("/", async (req, res) => {
  try {
    const { title, category, price, description, instructor, instructorEmail, chapters, quiz } = req.body;
    if (!title || !category || price === undefined || price === null || price === "" || !description) {
      return res.status(400).json({ error: "Title, category, price and description are required (price can be 0 for a free course)." });
    }
    if (price < 0) {
      return res.status(400).json({ error: "Price can't be negative." });
    }
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: "At least one chapter is required." });
    }
    // Quiz is optional — an empty array is fine. If provided, each question must be well-formed.
    const cleanQuiz = Array.isArray(quiz) ? quiz.filter(q => q && q.q && Array.isArray(q.options)) : [];

    const course = await Course.create({
      title, category, price, description, instructor, instructorEmail,
      chapters: chapters.map(c => ({ title: c.title, videoUrl: c.videoUrl || "" })),
      quiz: cleanQuiz.map(q => ({ q: q.q, options: q.options, answer: q.answer })),
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/instructor/:email/students
// A roster of every student enrolled in ANY of this instructor's courses,
// with their class/enrollment number and how many of this instructor's
// assignments they've submitted — built for the instructor dashboard's
// "My Students" table.
router.get("/instructor/:email/students", async (req, res) => {
  try {
    const instructorEmail = req.params.email;
    const courses = await Course.find({ instructorEmail });
    const courseIds = courses.map(c => String(c._id));

    const enrollments = await Enrollment.find({ courseId: { $in: courseIds } });
    const uniqueEmails = [...new Set(enrollments.map(e => e.user))];

    const assignments = await Assignment.find({ instructorEmail });
    const assignmentIds = assignments.map(a => String(a._id));

    const roster = await Promise.all(uniqueEmails.map(async (email) => {
      const user = await User.findOne({ email, role: "student" }).select("-password -verificationToken -resetPasswordToken");
      const submissions = await Submission.find({ studentEmail: email, assignmentId: { $in: assignmentIds } });
      const enrolledCourseCount = enrollments.filter(e => e.user === email).length;
      return {
        name: user ? user.name : email,
        email,
        studentClass: user ? user.studentClass : "",
        enrollmentNumber: user ? user.enrollmentNumber : "",
        coursesEnrolled: enrolledCourseCount,
        assignmentsSubmitted: submissions.length,
      };
    }));

    res.json(roster);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
