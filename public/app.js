/* ============================================================
   Online Course Marketplace — front-end
   This version talks to a real backend: Node.js + Express,
   backed by MongoDB. All course/user/enrollment data lives in
   the database now — the browser only keeps a small "who's
   logged in" marker in localStorage (a simple session flag,
   not sensitive data; a production app would use proper
   sessions or JWT tokens instead).
   ============================================================ */

const API = "/api";

async function apiGet(path) {
  const res = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function apiPatch(path, body) {
  const res = await fetch(API + path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function apiDelete(path) {
  const res = await fetch(API + path, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------- API client ----------
const api = {
  getCourses: () => apiGet("/courses"),
  getCourse: (id) => apiGet(`/courses/${id}`),
  getInstructorCourses: (email) => apiGet(`/courses/instructor/${encodeURIComponent(email)}`),
  getStudentRoster: (email) => apiGet(`/courses/instructor/${encodeURIComponent(email)}/students`),
  createCourse: (course) => apiPost("/courses", course),
  register: (user) => apiPost("/auth/register", user),
  login: (creds) => apiPost("/auth/login", creds),
  resendVerification: (email, role) => apiPost("/auth/resend-verification", { email, role }),
  forgotPassword: (email, role) => apiPost("/auth/forgot-password", { email, role }),
  resetPassword: (token, newPassword) => apiPost("/auth/reset-password", { token, newPassword }),
  getEnrollmentsForUser: (email) => apiGet(`/enrollments?user=${encodeURIComponent(email)}`),
  getEnrollmentsForCourse: (courseId) => apiGet(`/enrollments?course=${courseId}`),
  enroll: (user, courseId) => apiPost("/enrollments", { user, courseId }),
  bulkEnroll: (courseId, emails) => apiPost("/enrollments/bulk", { courseId, emails }),
  updateEnrollment: (id, patch) => apiPatch(`/enrollments/${id}`, patch),

  getAssignmentsForCourse: (courseId) => apiGet(`/assignments?course=${courseId}`),
  getAssignmentsForInstructor: (email) => apiGet(`/assignments?instructor=${encodeURIComponent(email)}`),
  createAssignment: (a) => apiPost("/assignments", a),
  getSubmissions: (assignmentId) => apiGet(`/assignments/${assignmentId}/submissions`),
  submitAssignment: (assignmentId, body) => apiPost(`/assignments/${assignmentId}/submissions`, body),
  getMySubmissions: (email) => apiGet(`/assignments/submissions/mine?student=${encodeURIComponent(email)}`),
  gradeSubmission: (id, patch) => apiPatch(`/assignments/submissions/${id}`, patch),

  getAdminStats: () => apiGet("/admin/stats"),
  getAllUsers: () => apiGet("/admin/users"),
  deleteUser: (id) => apiDelete(`/admin/users/${id}`),
  deleteCourse: (id) => apiDelete(`/admin/courses/${id}`),

  uploadVideo: async (file) => {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch(API + "/upload/video", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },

  getProfile: (email) => apiGet(`/profile/${encodeURIComponent(email)}`),
  updateBio: (email, bio) => apiPatch(`/profile/${encodeURIComponent(email)}`, { bio }),
};

// ---------- Client-side session (just remembers who's logged in) ----------
const session = {
  get: () => JSON.parse(localStorage.getItem("ocm_current_user") || "null"),
  set: (u) => localStorage.setItem("ocm_current_user", JSON.stringify(u)),
  clear: () => localStorage.removeItem("ocm_current_user"),
};

// ---------- Navbar rendering (shared across pages) ----------
function renderNavbar(active) {
  const user = session.get();
  const el = document.getElementById("navbar");
  if (!el) return;
  const links = [{ href: "index.html", label: "Browse Courses", key: "browse" }];
  if (user && user.role === "student") links.push({ href: "student-dashboard.html", label: "My Dashboard", key: "dash" });
  if (user && user.role === "instructor") links.push({ href: "instructor-dashboard.html", label: "Instructor Dashboard", key: "dash" });
  if (user && user.role === "admin") links.push({ href: "admin-dashboard.html", label: "Admin Dashboard", key: "dash" });

  el.innerHTML = `
    <div class="container">
      <a class="brand" href="index.html">Course<span>Hub</span></a>
      <div class="nav-links">
        ${links.map(l => `<a href="${l.href}" style="${active===l.key ? 'color:white;font-weight:700;' : ''}">${l.label}</a>`).join("")}
        ${user
          ? `<a href="profile.html?email=${encodeURIComponent(user.email)}" class="user-pill" style="text-decoration:none;">${user.name} · ${user.role}</a><a href="#" id="logoutLink">Logout</a>`
          : `<a href="login.html" class="btn btn-primary btn-small">Login / Register</a>`}
      </div>
    </div>`;

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      session.clear();
      window.location.href = "index.html";
    });
  }
}

function requireRole(role) {
  const user = session.get();
  if (!user || user.role !== role) {
    window.location.href = "login.html";
  }
  return user;
}

function money(n) {
  return "₹" + n.toLocaleString("en-IN");
}
