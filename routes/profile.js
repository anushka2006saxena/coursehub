const express = require("express");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Assignment = require("../models/Assignment");

const router = express.Router();

// GET /api/profile/:email
router.get("/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await User.findOne({ email }).select("-password -verificationToken -resetPasswordToken");
    if (!user) return res.status(404).json({ error: "User not found." });

    let stats = {};

    if (user.role === "student") {
      const enrollments = await Enrollment.find({ user: email });
      stats = {
        coursesEnrolled: enrollments.length,
        certificatesEarned: enrollments.filter(e => e.completed).length,
      };
    } else if (user.role === "instructor") {
      const courses = await Course.find({ instructorEmail: email });
      const enrollCounts = await Promise.all(courses.map(c => Enrollment.find({ courseId: c._id })));
      const assignments = await Assignment.find({ instructorEmail: email });
      stats = {
        coursesPublished: courses.length,
        totalStudentsTaught: enrollCounts.reduce((sum, arr) => sum + arr.length, 0),
        assignmentsPosted: assignments.length,
      };
    }

    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio || "",
      memberSince: user.createdAt,
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile/:email  — update your own bio
router.patch("/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { bio } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { bio: (bio || "").slice(0, 300) },
      { new: true }
    ).select("-password -verificationToken -resetPasswordToken");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ bio: user.bio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
