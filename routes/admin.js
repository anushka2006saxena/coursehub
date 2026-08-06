const express = require("express");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Assignment = require("../models/Assignment");

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalStudents, totalInstructors, totalCourses, totalEnrollments, totalAssignments] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Assignment.countDocuments(),
    ]);
    res.json({ totalStudents, totalInstructors, totalCourses, totalEnrollments, totalAssignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users  — full user list, passwords excluded
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id  — remove a user account
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    await User.findByIdAndDelete(req.params.id);
    res.json({ deleted: true, email: user.email });
  } catch (err) {
    res.status(404).json({ error: "User not found." });
  }
});

// DELETE /api/admin/courses/:id  — remove a course (and its enrollments/assignments)
router.delete("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found." });
    await Course.findByIdAndDelete(req.params.id);
    await Enrollment.deleteMany({ courseId: req.params.id });
    await Assignment.deleteMany({ courseId: req.params.id });
    res.json({ deleted: true, title: course.title });
  } catch (err) {
    res.status(404).json({ error: "Course not found." });
  }
});

module.exports = router;
