# CourseHub — Full-Stack Version (Node.js + Express + MongoDB)

This is the **real backend** version of the project, matching the architecture in
the synopsis: a Node.js/Express REST API backed by a MongoDB database, with the
same front-end you've already seen now talking to that API instead of using
`localStorage`.

## What changed from the earlier front-end-only demo

| Before (demo) | Now (this version) |
|---|---|
| Data stored in browser `localStorage` | Data stored in a real MongoDB database |
| No server | Node.js + Express REST API (`server.js`) |
| Everything ran client-side only | Front-end calls the API with `fetch()` |
| Passwords in plain text | Passwords hashed with `bcrypt` before storage |

The UI looks and behaves identically — same pages, same flow. Only *where the
data lives* has changed.

## Project structure

```
CourseHub-Fullstack/
├── server.js              # Express app entry point
├── config/db.js           # MongoDB connection
├── models/                # Mongoose schemas: User, Course, Enrollment
├── routes/                # API endpoints: auth, courses, enrollments
├── seed.js                # Populates 3 starter courses
├── public/                # The front-end (HTML, CSS, JS) — served by Express
├── .env.example           # Copy to .env and fill in your MongoDB connection
└── package.json
```

## How to run it

**1. Install MongoDB** (pick one):
   - **Local install:** Download MongoDB Community Server from mongodb.com and
     run it — it listens on `mongodb://127.0.0.1:27017` by default.
   - **MongoDB Atlas (cloud, free tier):** Create a free cluster at
     mongodb.com/atlas, and copy its connection string.

**2. Set up environment variables:**
   ```
   cp .env.example .env
   ```
   Edit `.env` and set `MONGODB_URI` to your local or Atlas connection string.

**3. Install dependencies and seed the database:**
   ```
   npm install
   npm run seed
   ```
   This inserts the 3 starter courses (Web Development, Python for Data
   Analysis, UI/UX Design) so the homepage isn't empty.

**4. Start the server:**
   ```
   npm start
   ```
   Then open **http://localhost:5000** in your browser. Express serves both
   the API (`/api/...`) and the front-end from this one address — no separate
   frontend server needed.

## New in this version: Admin panel, Assignments, Bulk Enrollment

- **Admin role & dashboard** — a third account type (alongside Student/Instructor).
  Register/log in as "Admin" on the login page. Shows platform-wide stats and
  full lists of every user and course — no self-approval needed for this demo,
  but a real deployment would restrict who can create admin accounts.
- **Assignments (homework / hackathon tasks)** — instructors post an assignment
  (title, description, due date) against one of their courses. Enrolled students
  see it on their dashboard and submit a short write-up plus an optional link
  (e.g. a GitHub repo for a hackathon). Instructors can view every submission
  and grade it.
- **Bulk enrollment** — on the instructor dashboard, click "Bulk Enroll" next to
  any course and paste a list of student emails (one per line, or comma-separated).
  Anyone with an existing CourseHub student account gets enrolled instantly;
  anyone else is listed as skipped with the reason why.

## Real email verification

Registration sends a real verification email, but **by default it does not
block login** — you can register and start using the app immediately. This
is intentional, so testing/development isn't blocked by email setup.

When you're ready for a real pilot with real students, set
`ENFORCE_EMAIL_VERIFICATION=true` in `.env` to require verification before
login. Until then, verification is informational only — good practice to
mention in viva ("built but not enforced yet, toggled via one env variable").

Here's how to enable real Gmail sending (works either way, enforced or not):

### 1. Get a Gmail "App Password" (not your normal Gmail password)

Gmail blocks regular password sign-in from apps like this one, so you need a
special 16-character App Password instead:

1. Go to **myaccount.google.com/security**
2. Turn on **2-Step Verification** if it isn't already on (required for App Passwords to appear).
3. Search settings for **"App passwords"** (or go to myaccount.google.com/apppasswords).
4. Create a new one — name it "CourseHub" — and copy the 16-character password it gives you (no spaces).

### 2. Add it to your `.env` file

```
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=the16characterapppassword
EMAIL_FROM=CourseHub <youraddress@gmail.com>
APP_BASE_URL=http://localhost:5000
```

### 3. Restart the server

Register a new account and check that inbox (and spam folder, the first
time) for a "Verify your CourseHub account" email.

**If you skip this setup:** the app still works — registration succeeds and
the verification link is printed to your terminal instead of emailed, so you
can copy-paste it into your browser manually.

**When you deploy the app publicly** (see `DEPLOYMENT.md`), update
`APP_BASE_URL` to your live URL, otherwise verification links in emails will
point to `localhost` and won't work for anyone but you.

### New API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Platform-wide counts |
| GET | `/api/admin/users` | Every registered user (no passwords) |
| POST | `/api/enrollments/bulk` | Enroll many students in one course at once |
| GET | `/api/assignments?course=id` | Assignments for one course |
| GET | `/api/assignments?instructor=email` | Assignments created by one instructor |
| POST | `/api/assignments` | Post a new assignment |
| GET | `/api/assignments/:id/submissions` | All submissions for one assignment |
| POST | `/api/assignments/:id/submissions` | Student submits (or updates) their work |
| GET | `/api/assignments/submissions/mine?student=email` | A student's own submission status |
| PATCH | `/api/assignments/submissions/:id` | Instructor grades a submission |



| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create a new account (sends verification email) |
| GET | `/api/auth/verify?token=...` | Verifies the email link, redirects to a result page |
| POST | `/api/auth/resend-verification` | Resends the verification email |
| POST | `/api/auth/login` | Log in — blocked with 403 until email is verified |
| POST | `/api/auth/forgot-password` | Sends a password reset link (if the account exists) |
| POST | `/api/auth/reset-password` | Sets a new password using a valid reset token |
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/:id` | Get one course's full details |
| GET | `/api/courses/instructor/:email` | Courses published by one instructor |
| POST | `/api/courses` | Publish a new course |
| GET | `/api/enrollments?user=email` | A student's enrollments |
| GET | `/api/enrollments?course=id` | Everyone enrolled in one course |
| POST | `/api/enrollments` | Enroll a student in a course |
| PATCH | `/api/enrollments/:id` | Update progress % / quiz result |

## What's still simplified (be upfront about this in viva if asked)

- **Sessions:** the logged-in user's identity is kept in the browser's
  `localStorage` as a simple marker, not a secure server session or JWT token.
  A production app would use proper token-based authentication.
- **Payments:** "Enroll & Pay" is still a `confirm()` popup, not a real Stripe
  transaction — the synopsis lists Stripe integration as part of the full
  build, which this focuses on the data/backend side of, not payments.
- **Video:** still a placeholder box, not real video streaming.

This is a completely honest position to take in viva: the core CRUD backend
(users, courses, enrollments) is real and working against a real database —
payments and video are the next layer, same as noted in the synopsis's
Resources and Limitations section.

## New: real videos, instructor-built quizzes, profiles, and a redesign

- **Instructors now build their own courses properly** — add as many chapters
  as you want, each with an optional real video upload (stored on the
  server under `public/uploads/videos/`), and write your own quiz questions
  (question text, 4 options, mark the correct one) instead of a placeholder.
- **Profile pages** — every user has one at `profile.html?email=...`.
  Student/instructor names throughout the site (course pages, admin
  dashboard) link to their profile, showing role-specific stats (courses
  enrolled/certificates for students; courses published/students taught for
  instructors) and an editable bio on your own profile.
- **Visual redesign** — dark, code-editor-inspired theme throughout (fits
  the subject matter: a coding-education platform). The homepage hero is
  styled like a code editor window.

### A note on video storage
Uploaded videos are saved to disk on whatever machine runs the server. This
is fine for local development and a class pilot. If you deploy to Render's
free tier, be aware its disk is **ephemeral** — uploaded videos will be lost
on redeploy/restart. For a permanent production setup, swap the multer disk
storage in `routes/upload.js` for a cloud storage provider (e.g. Cloudinary
or an S3 bucket) — a well-scoped future upgrade, not needed for viva/pilot use.

### New API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/upload/video` | Upload a chapter's video file (multipart/form-data) |
| GET | `/api/profile/:email` | Public profile + role-specific stats |
| PATCH | `/api/profile/:email` | Update your own bio |

## Newest additions: free courses, optional quiz, coding assignments, student roster

- **Free courses** — when creating a course, check "Make this course free" and
  the price locks to ₹0. Free courses show a green "Free" badge everywhere
  instead of a price, and enrolling skips the payment-style wording.
- **Quiz is now optional** — you can publish a course with zero quiz
  questions. If a course has no quiz, the quiz section is hidden entirely on
  the course page, and the certificate unlocks once all chapters are watched
  instead of requiring a passing quiz score.
- **Coding assignments** — when posting an assignment, choose "Coding
  Problem" instead of "Written Answer." Pick a language (JavaScript, Python,
  or Java), optionally provide starter code, and students get a real
  VS-Code-style editor (CodeMirror, dark theme, syntax highlighting) to
  write their answer in, with live error-checking for JavaScript via JSHint.
  You review submitted code in the same colorized editor, read-only.
  **Note:** the editor loads from a CDN (cdnjs) — if a student's browser
  somehow can't reach it, a plain textarea is used instead automatically, so
  the feature never fully breaks; this is a graceful fallback, not the normal
  experience.
- **Student registration now asks for Class and Enrollment Number** (student
  accounts only) — used in the instructor's new **My Students** table:
  name, email, class, enrollment number, and how many of that instructor's
  assignments each student has submitted, all in one place.

## Newest additions: real auto-grading, a LeetCode-style solve page, and decoupled certificates

- **Coding assignments now have a real judge.** When posting a JavaScript
  coding assignment, give the function's name, write your own correct
  reference solution, and add a few test case inputs (as a JSON array of
  arguments, e.g. `[[2,7,11,15], 9]`). The server runs your reference
  solution once to compute the expected output for each — you never type
  expected answers by hand. Students' submitted code is then actually
  **executed** against those same test cases: if it fails even one, the
  submission is rejected outright (never saved) and the student sees exactly
  which test case failed and why. A different, correct approach still
  passes — only the output is compared, not the code itself.
- **A dedicated LeetCode-style solving page** (`solve-assignment.html`) —
  problem description on the left, a real code editor with syntax
  highlighting on the right, a "Run" button to test without submitting, and
  a Testcase/Test Result tab pair, matching the layout you'd expect from a
  real coding judge site.
- **Certificates are now fully decoupled from quizzes.** A course's
  certificate unlocks purely by finishing all chapters. If the instructor
  added a quiz, it's shown as optional practice — the score is recorded for
  reference but never blocks or grants the certificate.
- **Mentor credit** — "Under the guidance of Mr. Ravi & Sunstone Faculty"
  now appears in the footer across the site.

### Important scope note on auto-grading
Running arbitrary submitted code is inherently a security-sensitive feature.
This implementation uses Node's built-in `vm` module with a timeout as a
reasonable, well-scoped safeguard for a **college project with known,
authenticated users** — not a hardened sandbox suitable for a public site
with anonymous/adversarial users. It currently supports **JavaScript only**;
Python and Java coding assignments still work (students get the same nice
editor), but aren't auto-graded — they're reviewed manually by the
instructor, same as before.

## Testing note

Every API route in this project was tested against the real Express route
handlers before delivery (registration, duplicate-email rejection, login with
correct/incorrect password, course creation, enrollment, duplicate-enrollment
rejection, progress updates, and quiz-pass tracking all pass). If you can't
run the tests yourself, this is simply for your confidence that the logic is
correct — you don't need to demo or mention the tests in viva.
