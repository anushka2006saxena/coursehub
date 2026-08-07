const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendOtpEmail, sendPasswordResetEmail } = require("../utils/sendEmail");
const { setAuthCookie, clearAuthCookie } = require("../middleware/auth");

const router = express.Router();

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const OTP_EXPIRY_MS = 10 * 60 * 1000;   // 10 minutes

function baseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0"); // e.g. "042817"
}

async function issueOtp(user) {
  const otp = generateOtp();
  user.otpCode = await bcrypt.hash(otp, 10); // never store the plain code
  user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();
  const emailResult = await sendOtpEmail(user.email, user.name, otp);
  // No SMTP configured yet — hand the code back directly so registration is
  // fully testable without setting up Gmail first.
  return emailResult && emailResult.simulated ? otp : undefined;
}

// POST /api/auth/register — creates the account (unverified) and emails a 6-digit OTP.
// The account can't log in until /verify-otp succeeds.
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

    const user = await User.create({
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      password: passwordHash,
      role,
      studentClass: role === "student" ? (studentClass || "") : "",
      enrollmentNumber: role === "student" ? (enrollmentNumber || "") : "",
      emailVerified: false,
    });

    const devOtp = await issueOtp(user);

    res.status(201).json({
      registered: true,
      otpRequired: true,
      email: user.email,
      role: user.role,
      message: "We've emailed you a 6-digit code. Enter it to verify your account.",
      devOtp,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp  — { email, role, otp }
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, role, otp } = req.body;
    if (!email || !role || !otp) {
      return res.status(400).json({ error: "Email, role and code are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role });
    if (!user) return res.status(404).json({ error: "No matching account found." });
    if (user.emailVerified) return res.status(400).json({ error: "This account is already verified — you can log in." });
    if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ error: "This code has expired. Request a new one." });
    }

    const match = await bcrypt.compare(otp, user.otpCode);
    if (!match) {
      return res.status(400).json({ error: "Incorrect code — check your email and try again." });
    }

    user.emailVerified = true;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    // Verified — log them straight in.
    setAuthCookie(res, user);
    res.json({ verified: true, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-otp  — { email, role }
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase(), role });
    if (!user) return res.status(404).json({ error: "No matching account found." });
    if (user.emailVerified) return res.status(400).json({ error: "This account is already verified — you can log in." });

    const devOtp = await issueOtp(user);
    res.json({ resent: true, message: "A new code has been sent to your email.", devOtp });
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

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
        otpRequired: true,
        email: user.email,
        role: user.role,
      });
    }

    setAuthCookie(res, user);
    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ loggedOut: true });
});

module.exports = router;
