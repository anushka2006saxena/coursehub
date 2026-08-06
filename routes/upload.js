const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "videos");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Cloudinary is "configured" if either CLOUDINARY_URL is set, or all three of
// cloud name / api key / api secret are set. If none are set, we fall back to
// saving on local disk — fine for local dev, but NOT durable once deployed
// (see the note in .env.example).
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (cloudinaryConfigured && !process.env.CLOUDINARY_URL) {
  // cloudinary.config() picks up CLOUDINARY_URL automatically if present;
  // otherwise we configure it explicitly from the three separate vars.
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Buffer in memory rather than writing to disk first — needed either way:
// Cloudinary wants a stream/buffer, and it also means the local-disk fallback
// and Cloudinary path can share the same multer setup.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per video — fine for short lecture clips
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed."));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "video", folder: "coursehub/videos" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function saveToLocalDisk(file) {
  const unique = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(file.originalname) || ".mp4";
  const filename = `${Date.now()}-${unique}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/videos/${filename}`;
}

// POST /api/upload/video  — instructor uploads one chapter's video
router.post("/video", (req, res) => {
  upload.single("video")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No video file received." });

    try {
      if (cloudinaryConfigured) {
        const result = await uploadToCloudinary(req.file.buffer);
        return res.status(201).json({ url: result.secure_url });
      }
      // No Cloudinary configured — falls back to local disk. Fine for local
      // dev, but will NOT survive a redeploy/restart on most hosting.
      const url = saveToLocalDisk(req.file);
      return res.status(201).json({ url, warning: "Saved to local disk — set up Cloudinary before deploying, or this video will disappear on redeploy/restart." });
    } catch (uploadErr) {
      return res.status(500).json({ error: `Video upload failed: ${uploadErr.message}` });
    }
  });
});

module.exports = router;
