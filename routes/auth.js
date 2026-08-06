const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/sendEmail");

const router = express.Router();

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function baseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, studentClass, enrollmentNumber } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password and role are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: passwordHash,
      role,
      studentClass: role === "student" ? (studentClass || "") : "",
      enrollmentNumber: role === "student" ? (enrollmentNumber || "") : "",
    });

    res.status(201).json({ registered: true, message: "Account created! You can log in now." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase(), role });

    // Always respond the same way whether or not the account exists —
    // otherwise this endpoint could be used to check which emails are registered.
    const genericMessage = "If an account with that email exists, a password reset link has been sent.";

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_EXPIRY_MS);
    await user.save();

    const resetUrl = `${baseUrl(req)}/reset-password.html?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ message: genericMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ resetPasswordToken: token });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in with your new password." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase(), role });
    if (!user) {
      return res.status(401).json({ error: "No matching account found for that role." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
