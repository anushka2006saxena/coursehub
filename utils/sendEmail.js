const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      "EMAIL_USER / EMAIL_PASS not set in .env — verification emails will be logged " +
      "to the console instead of actually sent. See README for Gmail setup."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // a Gmail "App Password", not your normal password
    },
  });
  return transporter;
}

async function sendOtpEmail(to, name, otp) {
  const t = getTransporter();

  const subject = `${otp} is your CourseHub verification code`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1f3864;">Welcome to CourseHub, ${name}!</h2>
      <p>Enter this code to verify your email and activate your account:</p>
      <p style="margin:24px 0;font-size:32px;font-weight:800;letter-spacing:8px;color:#1f3864;background:#f3f0e8;padding:16px 20px;border-radius:8px;text-align:center;">
        ${otp}
      </p>
      <p style="color:#999;font-size:12px;">This code expires in 10 minutes. If you didn't create a CourseHub account, you can ignore this email.</p>
    </div>
  `;

  if (!t) {
    // No email credentials configured — fall back to logging so development/testing still works.
    console.log(`\n[DEV MODE — no email sent] OTP for ${to}: ${otp}\n`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

async function sendPasswordResetEmail(to, name, resetUrl) {
  const t = getTransporter();

  const subject = "Reset your CourseHub password";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1f3864;">Password reset requested</h2>
      <p>Hi ${name}, we received a request to reset your CourseHub password.</p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="background:#c9922b;color:#1f3864;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset My Password
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Or paste this link into your browser:<br>${resetUrl}</p>
      <p style="color:#999;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  if (!t) {
    console.log(`\n[DEV MODE — no email sent] Password reset link for ${to}:\n${resetUrl}\n`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
