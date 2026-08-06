require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const enrollmentRoutes = require("./routes/enrollments");
const assignmentRoutes = require("./routes/assignments");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const profileRoutes = require("./routes/profile");

const app = express();

app.use(cors());
app.use(express.json());

// ---- REST API ----
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/profile", profileRoutes);

// simple health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ---- Serve the front-end (the public/ folder) ----
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`CourseHub server running at http://localhost:${PORT}`));
});
