require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Course = require("./models/Course");

const DEFAULT_COURSES = [
  {
    title: "Web Development Fundamentals",
    instructor: "Rohit Malhotra",
    instructorEmail: "rohit@coursehub.demo",
    category: "Web Development",
    price: 799,
    description: "Learn HTML, CSS and JavaScript from scratch and build your first responsive website.",
    chapters: [{ title: "Introduction to HTML", videoUrl: "" }, { title: "Styling with CSS", videoUrl: "" }, { title: "JavaScript Basics", videoUrl: "" }, { title: "Building a Project", videoUrl: "" }],
    quiz: [
      { q: "Which tag is used to create a hyperlink in HTML?", options: ["<link>", "<a>", "<href>", "<nav>"], answer: 1 },
      { q: "Which property changes text colour in CSS?", options: ["font-color", "text-color", "color", "text-style"], answer: 2 },
      { q: "Which keyword declares a block-scoped variable in JS?", options: ["var", "let", "static", "define"], answer: 1 },
    ],
  },
  {
    title: "Python for Data Analysis",
    instructor: "Ananya Rao",
    instructorEmail: "ananya@coursehub.demo",
    category: "Data Science",
    price: 999,
    description: "Get comfortable with Python, pandas and basic data visualisation for real datasets.",
    chapters: [{ title: "Python Basics", videoUrl: "" }, { title: "Working with pandas", videoUrl: "" }, { title: "Data Cleaning", videoUrl: "" }, { title: "Visualising Data", videoUrl: "" }],
    quiz: [
      { q: "Which library is most commonly used for data frames in Python?", options: ["numpy", "pandas", "matplotlib", "flask"], answer: 1 },
      { q: "Which function reads a CSV file in pandas?", options: ["pd.read_csv()", "pd.open_csv()", "pd.load()", "pd.csv()"], answer: 0 },
      { q: "Which symbol starts a comment in Python?", options: ["//", "#", "--", "/*"], answer: 1 },
    ],
  },
  {
    title: "UI/UX Design Essentials",
    instructor: "Kabir Sen",
    instructorEmail: "kabir@coursehub.demo",
    category: "Design",
    price: 649,
    description: "Understand core design principles, wireframing and prototyping for digital products.",
    chapters: [{ title: "Design Thinking", videoUrl: "" }, { title: "Wireframing", videoUrl: "" }, { title: "Prototyping", videoUrl: "" }, { title: "Usability Testing", videoUrl: "" }],
    quiz: [
      { q: "What does UX stand for?", options: ["User Experience", "User Exchange", "Unified Xperience", "User Extension"], answer: 0 },
      { q: "A wireframe is best described as:", options: ["A final design", "A low-fidelity layout sketch", "A colour palette", "A marketing plan"], answer: 1 },
      { q: "Usability testing is done to:", options: ["Sell the product", "Check real users can use the product easily", "Write code", "Design logos"], answer: 1 },
    ],
  },
];

(async () => {
  await connectDB();
  const count = await Course.countDocuments();
  if (count > 0) {
    console.log(`Database already has ${count} course(s) — skipping seed. Delete them first if you want to reseed.`);
  } else {
    await Course.insertMany(DEFAULT_COURSES);
    console.log(`Seeded ${DEFAULT_COURSES.length} courses.`);
  }
  await mongoose.disconnect();
  process.exit(0);
})();
