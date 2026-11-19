"use strict";

const DEFAULT_USERS = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "System Administrator",
    id: "A001"
  },
  {
    username: "teacher",
    password: "teach123",
    role: "teacher",
    name: "Demo Teacher",
    id: "T001"
  },
  {
    username: "student",
    password: "stud123",
    role: "student",
    name: "Sample Student One",
    id: "ST001"
  }
];

const seed = {
  students: [
    { id: "ST001", name: "Sample Student One", course: "BCA", year: "1st Year" },
    { id: "ST002", name: "Sample Student Two", course: "BCA", year: "1st Year" },
    { id: "ST003", name: "Sample Student Three", course: "BCA", year: "2nd Year" }
  ],

  exams: [
    { id: 1, name: "Sample Mathematics Examination", date: "2026-12-01", time: "10:00", room: "Room A" },
    { id: 2, name: "Sample Programming Examination", date: "2026-12-04", time: "14:00", room: "Computer Lab 1" },
    { id: 3, name: "Sample Web Technology Examination", date: "2026-12-08", time: "10:00", room: "Computer Lab 2" }
  ],

  marks: [
    { id: 1, studentId: "ST001", subject: "Sample Mathematics", assessment: "Internal Assessment", date: "2026-11-05", obtained: 24, total: 30 },
    { id: 2, studentId: "ST001", subject: "Sample Programming", assessment: "Assignment", date: "2026-11-08", obtained: 17, total: 20 },
    { id: 3, studentId: "ST002", subject: "Sample Mathematics", assessment: "Internal Assessment", date: "2026-11-05", obtained: 22, total: 30 },
    { id: 4, studentId: "ST003", subject: "Sample Web Technology", assessment: "Internal Assessment", date: "2026-11-12", obtained: 26, total: 30 }
  ]
};

// Load data from local storage
function load(key, fallback) {
  try {
    const v = localStorage.getItem("Metron_" + key);
    return v ? JSON.parse(v) : JSON.parse(JSON.stringify(fallback));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

let users = load("users", DEFAULT_USERS);
let students = load("students", seed.students);
let exams = load("exams", seed.exams);
let marks = load("marks", seed.marks);

let currentUser = null;
let currentPage = "dashboard";

const el = id => document.getElementById(id);

// Save all data
function save() {
  localStorage.setItem("Metron_users", JSON.stringify(users));
  localStorage.setItem("Metron_students", JSON.stringify(students));
  localStorage.setItem("Metron_exams", JSON.stringify(exams));
  localStorage.setItem("Metron_marks", JSON.stringify(marks));
}

// Prevent unsafe HTML insertion
function safe(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// Format date
function dateText(d) {
  return d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "—";
}

// Notifications
function notify(msg) {
  el("toast").textContent = msg;
  el("toast").classList.add("show");

  setTimeout(() => {
    el("toast").classList.remove("show");
  }, 2300);
}

// Get student name
function nameOf(id) {
  return students.find(s => s.id === id)?.name || "Unknown student";
}

// Get current student's marks
function ownMarks() {
  return marks.filter(m => m.studentId === currentUser.id);
}

// Calculate average percentage
function average(list) {
  return list.length
    ? Math.round(
        list.reduce((a, m) => a + m.obtained / m.total * 100, 0) / list.length
      )
    : 0;
}

// Navigation items based on role
function navItems() {
  let a = [
    ["dashboard", "⌂", "Dashboard"],
    ["exams", "▦", "Exam schedule"],
    ["marks", "▤", currentUser.role === "student" ? "My results" : "Marks & gradebook"]
  ];

  if (currentUser.role !== "student") {
    a.push(["students", "♙", "Students"]);
  }

  if (currentUser.role === "admin") {
    a.push(["users", "⚙", "User management"]);
  }

  return a;
}

// Login
function login(user) {
  currentUser = user;
  currentPage = "dashboard";

  el("loginPage").classList.add("hidden");
  el("portalPage").classList.remove("hidden");

  el("profileName").textContent = user.name;
  el("profileRole").textContent = user.role.toUpperCase();

  el("avatar").textContent = user.name
    .split(" ")
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  el("roleBadge").textContent = user.role.toUpperCase();

  render();
}

// Logout
function logout() {
  currentUser = null;

  el("portalPage").classList.add("hidden");
  el("loginPage").classList.remove("hidden");

  el("password").value = "";
  el("loginError").textContent = "";
}

// Login form handler
el("loginForm").addEventListener("submit", e => {
  e.preventDefault();

  const username = el("username").value.trim();
  const password = el("password").value;

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    el("loginError").textContent =
      "Incorrect username or password. Try a demo account.";
    return;
  }

  login(user);
});

// Demo account autofill
document.querySelectorAll("[data-demo]").forEach(b => {
  b.addEventListener("click", () => {
    const creds = {
      admin: ["admin", "admin123"],
      teacher: ["teacher", "teach123"],
      student: ["student", "stud123"]
    }[b.dataset.demo];

    el("username").value = creds[0];
    el("password").value = creds[1];
    el("loginError").textContent = "";
  });
});

// General event listeners
el("logoutBtn").onclick = logout;

el("menuBtn").onclick = () => {
  el("sidebar").classList.toggle("open");
};

el("modalClose").onclick = closeModal;

el("modalBg").onclick = e => {
  if (e.target === el("modalBg")) {
    closeModal();
  }
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// Statistic card
function stat(icon, value, label) {
  return `
    <div class="stat">
      <div class="stat-top">
        ${label}
        <span class="stat-icon">${icon}</span>
      </div>
      <h2>${value}</h2>
    </div>
  `;
}

// Page heading
function heading(title, desc, action = "") {
  return `
    <div class="welcome">
      <div>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>

      <span class="date-chip">
        ${new Date().toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        })}
      </span>
      ${action}
    </div>
  `;
}

// Panel
function panel(title, body, desc = "") {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>${title}</h3>
          <p>${desc}</p>
        </div>
      </div>
      ${body}
    </section>
  `;
}

// Examination table
function examTable() {
  if (!exams.length) {
    return `<div class="empty">No examination schedules have been published yet.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>EXAMINATION</th>
            <th>DATE</th>
            <th>TIME</th>
            <th>VENUE</th>
            ${currentUser.role === "admin" ? "<th>ACTION</th>" : ""}
          </tr>
        </thead>

        <tbody>
          ${exams
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(x => `
              <tr>
                <td><b>${safe(x.name)}</b></td>
                <td>${dateText(x.date)}</td>
                <td>${safe(x.time)}</td>
                <td>${safe(x.room)}</td>

                ${
                  currentUser.role === "admin"
                    ? `<td><button class="link" onclick="removeRecord('exams',${x.id})">Delete</button></td>`
                    : ""
                }
              </tr>
            `)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Marks table
function marksTable(list) {
  if (!list.length) {
    return `<div class="empty">No marks have been published yet.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${currentUser.role !== "student" ? "<th>STUDENT</th>" : ""}
            <th>SUBJECT</th>
            <th>ASSESSMENT</th>
            <th>DATE</th>
            <th>MARKS</th>
            <th>RESULT</th>
            ${currentUser.role !== "student" ? "<th>ACTION</th>" : ""}
          </tr>
        </thead>

        <tbody>
          ${list.map(m => `
            <tr>
              ${
                currentUser.role !== "student"
                  ? `<td>${safe(nameOf(m.studentId))}</td>`
                  : ""
              }

              <td><b>${safe(m.subject)}</b></td>
              <td>${safe(m.assessment)}</td>
              <td>${dateText(m.date)}</td>
              <td>${m.obtained} / ${m.total}</td>

              <td>
                <span class="pill ${m.obtained / m.total >= .4 ? "good" : ""}">
                  ${Math.round(m.obtained / m.total * 100)}%
                </span>
              </td>

              ${
                currentUser.role !== "student"
                  ? `<td>
                      <button class="link" onclick="editMark(${m.id})">Edit</button>
                      ${
                        currentUser.role === "admin"
                          ? `<button class="link" onclick="removeRecord('marks',${m.id})">Delete</button>`
                          : ""
                      }
                    </td>`
                  : ""
              }
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Dashboard
function dashboard() {

  // Student dashboard
  if (currentUser.role === "student") {
    const mine = ownMarks();

    return `
      ${heading(
        "Welcome, " + safe(currentUser.name.split(" ")[0]) + " 👋",
        "Here is your examination portal overview."
      )}

      <div class="hero-card">
        <small>YOUR CURRENT ASSESSMENT AVERAGE · DEMO</small>
        <h2>${average(mine)}%</h2>
        <p>Based on marks currently published to your student account. This is not an official GPA.</p>
      </div>

      <div class="stats">
        ${stat("▦", exams.length, "Exam schedules")}
        ${stat("▤", mine.length, "Published results")}
        ${stat("✓", mine.filter(m => m.obtained / m.total >= .4).length, "Assessments passed")}
        ${stat("♙", 1, "Your student profile")}
      </div>

      <div class="grid2">
        ${panel("My recent results", marksTable(mine.slice(-4)), "Your personal subject-wise marks.")}
        ${panel("Next examinations", examTable(), "Check your exam dates, times and venues.")}
      </div>
    `;
  }

  // Teacher dashboard
  if (currentUser.role === "teacher") {
    return `
      ${heading(
        "Faculty dashboard",
        "Welcome back. Manage your assessments and student results."
      )}

      <div class="stats">
        ${stat("♙", students.length, "Students")}
        ${stat("▤", marks.length, "Mark records")}
        ${stat("▦", exams.length, "Exam schedules")}
        ${stat("✓", marks.length, "Published results")}
      </div>

      ${panel(
        "Assessment gradebook",
        marksTable(marks.slice(-6)),
        "Add marks or update an existing assessment."
      )}

      ${panel("Examination timetable", examTable())}
    `;
  }

  // Admin dashboard
  return `
    ${heading(
      "Administrator dashboard",
      "Welcome to the central examination management portal."
    )}

    <div class="stats">
      ${stat("♙", students.length, "Students")}
      ${stat("▤", marks.length, "Mark records")}
      ${stat("▦", exams.length, "Exam schedules")}
      ${stat("⚙", users.length, "User accounts")}
    </div>

    <div class="grid2">
      ${panel(
        "Latest assessment records",
        marksTable(marks.slice(-5)),
        "Review, edit or remove academic records."
      )}

      ${panel(
        "Portal administration",
        `<div class="empty">You have full control over users, students, examinations and marks.</div>`,
        "Administrator access"
      )}
    </div>

    ${panel("Examination timetable", examTable())}
  `;
}

// Student table
function studentTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STUDENT NAME</th>
            <th>STUDENT ID</th>
            <th>COURSE</th>
            <th>YEAR</th>
            ${currentUser.role === "admin" ? "<th>ACTION</th>" : ""}
          </tr>
        </thead>

        <tbody>
          ${students.map(s => `
            <tr>
              <td><b>${safe(s.name)}</b></td>
              <td>${safe(s.id)}</td>
              <td>${safe(s.course)}</td>
              <td>${safe(s.year)}</td>

              ${
                currentUser.role === "admin"
                  ? `<td><button class="link" onclick="removeRecord('students','${safe(s.id)}')">Delete</button></td>`
                  : ""
              }
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// User table
function usersTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>USERNAME</th>
            <th>ROLE</th>
            <th>LINKED ID</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          ${users.map(u => `
            <tr>
              <td><b>${safe(u.name)}</b></td>
              <td>${safe(u.username)}</td>
              <td><span class="pill">${u.role}</span></td>
              <td>${safe(u.id || "—")}</td>

              <td>
                ${
                  u.username === "admin"
                    ? "Protected"
                    : `<button class="link" onclick="removeUser('${safe(u.username)}')">Delete</button>`
                }
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Render portal
function render() {
  const items = navItems();

  if (!items.some(x => x[0] === currentPage)) {
    currentPage = "dashboard";
  }

  el("nav").innerHTML = items.map(x => `
    <button
      data-page="${x[0]}"
      class="${currentPage === x[0] ? "active" : ""}">
      ${x[1]} &nbsp; ${x[2]}
    </button>
  `).join("");

  el("nav").querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      currentPage = b.dataset.page;
      el("sidebar").classList.remove("open");
      render();
    };
  });

  el("crumb").textContent =
    items.find(x => x[0] === currentPage)?.[2] || "Dashboard";

  let html = "";

  if (currentPage === "dashboard") {
    html = dashboard();
  }

  if (currentPage === "exams") {
    html = `
      ${heading(
        "Examination schedule",
        "View published examination dates, times and venues.",
        currentUser.role === "admin"
          ? '<button class="btn primary" onclick="examForm()">＋ Add exam</button>'
          : ""
      )}

      ${panel(
        "Published examinations",
        examTable(),
        "The latest examination timetable."
      )}
    `;
  }

  if (currentPage === "marks") {
    html = `
      ${heading(
        currentUser.role === "student" ? "My results" : "Marks & gradebook",
        currentUser.role === "student"
          ? "View marks published for your student account."
          : "Manage student assessments and marks.",
        currentUser.role !== "student"
          ? '<button class="btn primary" onclick="markForm()">＋ Add marks</button>'
          : ""
      )}

      ${panel(
        currentUser.role === "student"
          ? "Your published results"
          : "All student assessment records",
        marksTable(currentUser.role === "student" ? ownMarks() : marks),
        ""
      )}
    `;
  }

  if (currentPage === "students") {
    html = `
      ${heading(
        "Student directory",
        "View registered student profiles.",
        currentUser.role === "admin"
          ? '<button class="btn primary" onclick="studentForm()">＋ Add student</button>'
          : ""
      )}

      ${panel("Registered students", studentTable(), "")}
    `;
  }

  if (currentPage === "users") {
    html = `
      ${heading(
        "User management",
        "Create and manage teacher and student portal accounts.",
        '<button class="btn primary" onclick="userForm()">＋ Create account</button>'
      )}

      ${panel(
        "Portal accounts",
        usersTable(),
        "Administrator-only account management."
      )}
    `;
  }

  el("content").innerHTML = html;
}

// Open modal
function openModal(title, html) {
  el("modalTitle").textContent = title;
  el("modalBody").innerHTML = html;
  el("modalBg").classList.add("show");
}

// Close modal
function closeModal() {
  el("modalBg").classList.remove("show");
}

// Form handler
function onForm(fn) {
  el("recordForm").onsubmit = e => {
    e.preventDefault();
    fn(new FormData(e.target));
  };
}

// Add examination
function examForm() {
  if (currentUser.role !== "admin") return;

  openModal(
    "Add examination",
    `
      <form id="recordForm">
        <div class="field">
          <label>Examination name</label>
          <input name="name" required>
        </div>

        <div class="field">
          <label>Date</label>
          <input name="date" type="date" required>
        </div>

        <div class="field">
          <label>Time</label>
          <input name="time" type="time" required>
        </div>

        <div class="field">
          <label>Venue</label>
          <input name="room" required>
        </div>

        <button class="btn primary full">Publish exam schedule</button>
      </form>
    `
  );

  onForm(f => {
    exams.push({
      id: Date.now(),
      name: f.get("name"),
      date: f.get("date"),
      time: f.get("time"),
      room: f.get("room")
    });

    save();
    closeModal();
    render();
    notify("Examination schedule published");
  });
}

// Add marks
function markForm() {
  if (currentUser.role === "student") return;

  if (!students.length) {
    notify("Add a student first");
    return;
  }

  openModal(
    "Publish student marks",
    `
      <form id="recordForm">

        <div class="field">
          <label>Student</label>
          <select name="studentId" required>
            ${students.map(s => `
              <option value="${safe(s.id)}">
                ${safe(s.name)} (${safe(s.id)})
              </option>
            `).join("")}
          </select>
        </div>

        <div class="field">
          <label>Subject</label>
          <input name="subject" required>
        </div>

        <div class="field">
          <label>Assessment type</label>
          <select name="assessment">
            <option>Internal Assessment</option>
            <option>Assignment</option>
            <option>Quiz</option>
            <option>Practical</option>
            <option>Semester Examination</option>
          </select>
        </div>

        <div class="field">
          <label>Date</label>
          <input name="date" type="date" required>
        </div>

        <div class="field">
          <label>Maximum marks</label>
          <input name="total" type="number" min="1" required>
        </div>

        <div class="field">
          <label>Marks obtained</label>
          <input name="obtained" type="number" min="0" required>
        </div>

        <button class="btn primary full">Publish marks</button>
      </form>
    `
  );

  onForm(f => {
    const total = +f.get("total");
    const obtained = +f.get("obtained");

    if (total < 1 || obtained < 0 || obtained > total) {
      notify("Marks must be between zero and maximum marks");
      return;
    }

    marks.push({
      id: Date.now(),
      studentId: f.get("studentId"),
      subject: f.get("subject"),
      assessment: f.get("assessment"),
      date: f.get("date"),
      total,
      obtained
    });

    save();
    closeModal();
    render();
    notify("Marks published to student portal");
  });
}

// Edit marks
function editMark(id) {
  if (currentUser.role === "student") return;

  const m = marks.find(x => x.id === id);
  if (!m) return;

  openModal(
    "Update assessment marks",
    `
      <p class="muted">
        ${safe(nameOf(m.studentId))} · ${safe(m.subject)} · Maximum ${m.total}
      </p>

      <form id="recordForm">
        <div class="field">
          <label>Marks obtained</label>
          <input
            name="obtained"
            type="number"
            min="0"
            max="${m.total}"
            value="${m.obtained}"
            required>
        </div>

        <button class="btn primary full">Save updated marks</button>
      </form>
    `
  );

  onForm(f => {
    const n = +f.get("obtained");

    if (n < 0 || n > m.total) {
      notify("Please enter valid marks");
      return;
    }

    m.obtained = n;
    save();
    closeModal();
    render();
    notify("Marks updated successfully");
  });
}

// Add student
function studentForm() {
  if (currentUser.role !== "admin") return;

  openModal(
    "Add student",
    `
      <form id="recordForm">

        <div class="field">
          <label>Full name</label>
          <input name="name" required>
        </div>

        <div class="field">
          <label>Course</label>
          <input name="course" value="BCA" required>
        </div>

        <div class="field">
          <label>Year</label>
          <select name="year">
            <option>1st Year</option>
            <option>2nd Year</option>
            <option>3rd Year</option>
          </select>
        </div>

        <button class="btn primary full">Add student</button>
      </form>
    `
  );

  onForm(f => {
    const id = "ST" + String(Date.now()).slice(-5);

    students.push({
      id,
      name: f.get("name"),
      course: f.get("course"),
      year: f.get("year")
    });

    save();
    closeModal();
    render();
    notify("Student added. Create their login separately.");
  });
}

// Create user
function userForm() {
  if (currentUser.role !== "admin") return;

  openModal(
    "Create portal account",
    `
      <form id="recordForm">

        <div class="field">
          <label>Full name</label>
          <input name="name" required>
        </div>

        <div class="field">
          <label>Username</label>
          <input name="username" required>
        </div>

        <div class="field">
          <label>Password</label>
          <input name="password" minlength="4" required>
        </div>

        <div class="field">
          <label>Role</label>
          <select name="role">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>

        <div class="field">
          <label>Linked student (required for student)</label>
          <select name="id">
            <option value="">Select student</option>
            ${students.map(s => `
              <option value="${safe(s.id)}">
                ${safe(s.name)} — ${safe(s.id)}
              </option>
            `).join("")}
          </select>
        </div>

        <button class="btn primary full">Create account</button>
      </form>
    `
  );

  onForm(f => {
    const username = f.get("username").trim();
    const role = f.get("role");

    const id = role === "student"
      ? f.get("id")
      : "T" + Date.now().toString().slice(-5);

    if (users.some(u => u.username === username)) {
      notify("Username already exists");
      return;
    }

    if (role === "student" && !id) {
      notify("Select the linked student");
      return;
    }

    users.push({
      name: f.get("name"),
      username,
      password: f.get("password"),
      role,
      id
    });

    save();
    closeModal();
    render();
    notify("Portal account created");
  });
}

// Delete record
function removeRecord(type, id) {
  if (currentUser.role !== "admin") return;

  if (!confirm("Delete this record?")) return;

  if (type === "exams") {
    exams = exams.filter(x => x.id !== id);
  }

  if (type === "marks") {
    marks = marks.filter(x => x.id !== id);
  }

  if (type === "students") {
    students = students.filter(x => x.id !== id);
    marks = marks.filter(x => x.studentId !== id);
    users = users.filter(x => x.id !== id);
  }

  save();
  render();
  notify("Record deleted");
}

// Delete user
function removeUser(username) {
  if (currentUser.role !== "admin" || username === "admin") return;

  if (!confirm("Delete this account?")) return;

  users = users.filter(u => u.username !== username);

  save();
  render();
  notify("Account deleted");
}

// Save initial data
save();