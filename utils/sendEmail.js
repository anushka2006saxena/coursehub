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

async function sendVerificationEmail(to, name, verifyUrl) {
  const t = getTransporter();

  const subject = "Verify your CourseHub account";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1f3864;">Welcome to CourseHub, ${name}!</h2>
      <p>Please confirm your email address to activate your account.</p>
      <p style="margin:24px 0;">
        <a href="${verifyUrl}" style="background:#c9922b;color:#1f3864;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Verify My Email
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Or paste this link into your browser:<br>${verifyUrl}</p>
      <p style="color:#999;font-size:12px;">This link expires in 24 hours.</p>
    </div>
  `;

  if (!t) {
    // No email credentials configured — fall back to logging so development/testing still works.
    console.log(`\n[DEV MODE — no email sent] Verification link for ${to}:\n${verifyUrl}\n`);
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

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
