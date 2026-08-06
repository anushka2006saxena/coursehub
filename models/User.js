const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
  role: { type: String, enum: ["student", "instructor", "admin"], required: true },
  bio: { type: String, default: "" },
  studentClass: { type: String, default: "" },       // e.g. "B.Tech CSE, 5th Sem"
  enrollmentNumber: { type: String, default: "" },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
