
"use strict";

/*
  METRON FIREBASE AUTHENTICATION
  Firebase Authentication handles sign-in.
  Firestore users/{uid} stores the approved role and profile.
*/

const firebaseConfig = {
  apiKey: "AIzaSyCkwkobuoXZrbUmal-RaZl3DMEpoWK4nJI",
  authDomain: "metron-c5bcc.firebaseapp.com",
  projectId: "metron-c5bcc",
  storageBucket: "metron-c5bcc.firebasestorage.app",
  messagingSenderId: "641629648403",
  appId: "1:641629648403:web:ce51547dfca7320e6331e6",
  measurementId: "G-N3BQS594Q2"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

const el = id => document.getElementById(id);

let currentUser = null;
let currentProfile = null;
let currentPage = "dashboard";
let selectedRole = "student";
let isLoginInProgress = false;
let authInitialized = false;


// --------------------------------
// ROLE SELECTOR
// --------------------------------

document.querySelectorAll("[data-role]").forEach(button => {
  button.addEventListener("click", () => {
    selectedRole = button.dataset.role;

    document.querySelectorAll("[data-role]").forEach(option => {
      option.classList.toggle(
        "selected",
        option.dataset.role === selectedRole
      );

      option.setAttribute(
        "aria-pressed",
        String(option.dataset.role === selectedRole)
      );
    });

    el("selectedRoleText").textContent =
      "Signing in as " +
      selectedRole.charAt(0).toUpperCase() +
      selectedRole.slice(1);
  });
});


// --------------------------------
// CHECK ROLE AND OPEN PORTAL
// --------------------------------


async function loadProfile(user) {
  const userRef = db.collection("users").doc(user.uid);
  const profileSnapshot = await userRef.get();

  let profile;

  if (!profileSnapshot.exists) {
    if (selectedRole !== "student") {
      await auth.signOut();

      throw new Error(
        "This account is not registered as Teacher or Admin. Contact the administrator."
      );
    }

    profile = {
      full_name: user.displayName || user.email || "Student",
      role: "student"
    };

    await userRef.set(profile);

  } else {
    profile = profileSnapshot.data();
  }

  const allowedRoles = ["student", "teacher", "admin"];

  if (!allowedRoles.includes(profile.role)) {
    await auth.signOut();

    throw new Error(
      "This account has an invalid portal role. Contact the administrator."
    );
  }

  if (profile.role !== selectedRole) {
    await auth.signOut();

    throw new Error(
      "This account is registered as " +
      profile.role +
      ". Please select the correct login option."
    );
  }

  currentUser = user;

  currentProfile = {
    full_name:
      profile.full_name ||
      user.displayName ||
      user.email ||
      "Metron User",

    role: profile.role,
    student_id: profile.student_id || ""
  };

  loginToPortal();
}



// --------------------------------
// EMAIL AND PASSWORD LOGIN
// --------------------------------

el("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = el("identifier").value.trim();
  const password = el("password").value;
  const button = el("loginBtn");

  el("loginError").textContent = "";
  button.disabled = true;
  button.textContent = "Signing in...";

  isLoginInProgress = true;

  try {
    const result = await auth.signInWithEmailAndPassword(
      email,
      password
    );

    await loadProfile(result.user);

  } catch (error) {
    console.error(error);

    el("loginError").textContent =
      error.message.includes("not registered") ||
      error.message.includes("registered as") ||
      error.message.includes("invalid portal role")
        ? error.message
        : "Login failed. Please check your email and password.";

  } finally {
    isLoginInProgress = false;
    button.disabled = false;
    button.textContent = "Sign in to portal →";
  }
});


// --------------------------------
// GOOGLE LOGIN
// --------------------------------

el("googleLoginBtn").addEventListener("click", async () => {
  const button = el("googleLoginBtn");

  el("loginError").textContent = "";
  button.disabled = true;
  button.textContent = "Connecting to Google...";

  isLoginInProgress = true;

  try {
    const result = await auth.signInWithPopup(googleProvider);

    await loadProfile(result.user);

  } catch (error) {
    console.error(error);

    el("loginError").textContent =
      error.message.includes("not registered") ||
      error.message.includes("registered as") ||
      error.message.includes("invalid portal role")
        ? error.message
        : "Google sign-in failed. Please try again.";

  } finally {
    isLoginInProgress = false;
    button.disabled = false;

    button.innerHTML =
      '<span class="google-mark">G</span> Continue with Google';
  }
});


// --------------------------------
// OPEN PORTAL
// --------------------------------

function loginToPortal() {
  el("loginPage").classList.add("hidden");
  el("portalPage").classList.remove("hidden");

  el("profileName").textContent = currentProfile.full_name;
  el("profileRole").textContent =
    currentProfile.role.toUpperCase();

  el("avatar").textContent = currentProfile.full_name
    .split(" ")
    .map(word => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  el("roleBadge").textContent =
    currentProfile.role.toUpperCase();

  currentPage = "dashboard";
  render();
}


// --------------------------------
// LOGOUT
// --------------------------------

async function logout() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  currentProfile = null;

  el("portalPage").classList.add("hidden");
  el("loginPage").classList.remove("hidden");

  el("password").value = "";
  el("identifier").value = "";
  el("loginError").textContent = "";
}

el("logoutBtn").addEventListener("click", logout);


// --------------------------------
// NAVIGATION
// --------------------------------

function navItems() {
  const role = currentProfile.role;

  const items = [
    ["dashboard", "⌂", "Dashboard"],
    ["exams", "▦", "Exam schedule"],
    [
      "marks",
      "▤",
      role === "student" ? "My results" : "Marks & gradebook"
    ]
  ];

  if (role !== "student") {
    items.push(["students", "♙", "Students"]);
  }

  if (role === "admin") {
    items.push(["users", "⚙", "User management"]);
  }

  return items;
}


function renderNavigation() {
  const items = navItems();

  if (!items.some(item => item[0] === currentPage)) {
    currentPage = "dashboard";
  }

  el("nav").innerHTML = items.map(item => `
    <button
      data-page="${item[0]}"
      class="${currentPage === item[0] ? "active" : ""}"
    >
      ${item[1]} &nbsp; ${item[2]}
    </button>
  `).join("");

  el("nav").querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      currentPage = button.dataset.page;
      el("sidebar").classList.remove("open");
      render();
    });
  });

  el("crumb").textContent =
    items.find(item => item[0] === currentPage)?.[2] ||
    "Dashboard";
}


// --------------------------------
// UI HELPERS
// --------------------------------

function heading(title, description) {
  return `
    <div class="welcome">
      <div>
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(description)}</p>
      </div>

      <span class="date-chip">
        ${new Date().toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        })}
      </span>
    </div>
  `;
}


function panel(title, body, description = "") {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(description)}</p>
        </div>
      </div>

      ${body}
    </section>
  `;
}


function stat(icon, value, label) {
  return `
    <div class="stat">
      <div class="stat-top">
        ${escapeHTML(label)}
        <span class="stat-icon">${icon}</span>
      </div>

      <h2>${value}</h2>
    </div>
  `;
}


function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


function emptyMessage(message) {
  return `<div class="empty">${escapeHTML(message)}</div>`;
}


function notify(message) {
  el("toast").textContent = message;
  el("toast").classList.add("show");

  setTimeout(() => {
    el("toast").classList.remove("show");
  }, 2300);
}


// --------------------------------

// --------------------------------
// FIRESTORE DATA
// --------------------------------

async function getExams() {
  const snapshot = await db.collection("exams").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.exam_date || "").localeCompare(String(b.exam_date || "")));
}

async function getStudents() {
  const snapshot = await db.collection("students").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
}

async function getMarks() {
  let query = db.collection("marks");

  if (currentProfile.role === "student") {
    query = query.where(
      "student_email",
      "==",
      String(currentUser.email || "").toLowerCase()
    );
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUsers() {
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function canManageStudents() {
  return ["teacher", "admin"].includes(currentProfile.role);
}

function isAdmin() {
  return currentProfile.role === "admin";
}


// --------------------------------
// TABLE BUILDERS
// --------------------------------

function examTable(exams) {
  const actions = isAdmin();

  if (!exams.length) {
    return emptyMessage("No examination schedules have been published yet.");
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
            ${actions ? "<th>ACTIONS</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${exams.map(exam => `
            <tr>
              <td><b>${escapeHTML(exam.name)}</b></td>
              <td>${escapeHTML(exam.exam_date)}</td>
              <td>${escapeHTML(exam.exam_time || "—")}</td>
              <td>${escapeHTML(exam.venue || "—")}</td>
              ${actions ? `
                <td>
                  <button class="link" data-action="edit-exam" data-id="${exam.id}">Edit</button>
                  <button class="link" data-action="delete-exam" data-id="${exam.id}">Delete</button>
                </td>
              ` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function marksTable(marks) {
  const isStudent = currentProfile.role === "student";
  const actions = canManageStudents();

  if (!marks.length) {
    return emptyMessage("No marks have been entered yet.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${!isStudent ? "<th>STUDENT</th>" : ""}
            <th>SUBJECT</th>
            <th>ASSESSMENT</th>
            <th>DATE</th>
            <th>MARKS</th>
            <th>RESULT</th>
            ${actions ? "<th>ACTIONS</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${marks.map(mark => {
            const percentage = Number(mark.total_marks) > 0
              ? Math.round(Number(mark.obtained_marks) / Number(mark.total_marks) * 100)
              : 0;

            return `
              <tr>
                ${!isStudent ? `<td><b>${escapeHTML(mark.student_name || "—")}</b></td>` : ""}
                <td>${escapeHTML(mark.subject)}</td>
                <td>${escapeHTML(mark.assessment)}</td>
                <td>${escapeHTML(mark.exam_date || "—")}</td>
                <td>${escapeHTML(mark.obtained_marks)} / ${escapeHTML(mark.total_marks)}</td>
                <td><span class="pill ${percentage >= 40 ? "good" : ""}">${percentage}%</span></td>
                ${actions ? `
                  <td>
                    <button class="link" data-action="edit-mark" data-id="${mark.id}">Edit</button>
                    <button class="link" data-action="delete-mark" data-id="${mark.id}">Delete</button>
                  </td>
                ` : ""}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function studentsTable(students) {
  if (!students.length) {
    return emptyMessage("No students have been added yet.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>ROLL NUMBER</th>
            <th>COURSE</th>
            <th>YEAR</th>
            <th>EMAIL</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(student => `
            <tr>
              <td><b>${escapeHTML(student.full_name)}</b></td>
              <td>${escapeHTML(student.student_id)}</td>
              <td>${escapeHTML(student.course || "—")}</td>
              <td>${escapeHTML(student.year || "—")}</td>
              <td>${escapeHTML(student.email || "—")}</td>
              <td>
                <button class="link" data-action="edit-student" data-id="${student.id}">Edit</button>
                <button class="link" data-action="delete-student" data-id="${student.id}">Remove</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


// --------------------------------
// MODAL HELPERS
// --------------------------------

function openModal(title, body) {
  el("modalTitle").textContent = title;
  el("modalBody").innerHTML = body;
  el("modalBg").classList.add("show");
}

function closeModal() {
  el("modalBg").classList.remove("show");
}

el("modalClose").addEventListener("click", closeModal);

el("modalBg").addEventListener("click", event => {
  if (event.target === el("modalBg")) closeModal();
});

function field(label, name, value = "", type = "text", required = true) {
  return `
    <div class="field">
      <label>${escapeHTML(label)}</label>
      <input
        name="${name}"
        type="${type}"
        value="${escapeHTML(value)}"
        ${required ? "required" : ""}
      >
    </div>
  `;
}


// --------------------------------
// ADD / EDIT STUDENT
// --------------------------------

async function studentForm(id = "") {
  let student = {};

  if (id) {
    const doc = await db.collection("students").doc(id).get();
    if (!doc.exists) return notify("Student not found.");
    student = doc.data();
  }

  openModal(id ? "Edit Student" : "Add Student", `
    <form id="studentForm">
      ${field("Student Name", "full_name", student.full_name)}
      ${field("Roll Number", "student_id", student.student_id)}
      ${field("Course", "course", student.course)}
      ${field("Year", "year", student.year)}
      ${field("Google Login Email", "email", student.email, "email")}

      <button class="btn primary full" type="submit">
        ${id ? "Save Changes" : "Add Student"}
      </button>
    </form>
  `);

  el("studentForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.target);
    const data = {
      full_name: String(form.get("full_name")).trim(),
      student_id: String(form.get("student_id")).trim(),
      course: String(form.get("course")).trim(),
      year: String(form.get("year")).trim(),
      email: String(form.get("email")).trim().toLowerCase()
    };

    try {
      if (id) {
        await db.collection("students").doc(id).update(data);
      } else {
        await db.collection("students").add(data);
      }

      closeModal();
      notify("Student saved successfully.");
      await render();
    } catch (error) {
      console.error(error);
      notify("Could not save student. Check Firestore rules.");
    }
  });
}


// --------------------------------
// ADD / EDIT EXAM
// --------------------------------

async function examForm(id = "") {
  if (!isAdmin()) return;

  let exam = {};

  if (id) {
    const doc = await db.collection("exams").doc(id).get();
    if (!doc.exists) return notify("Exam not found.");
    exam = doc.data();
  }

  openModal(id ? "Edit Examination" : "Add Examination", `
    <form id="examForm">
      ${field("Examination Name", "name", exam.name)}
      ${field("Examination Date", "exam_date", exam.exam_date, "date")}
      ${field("Examination Time", "exam_time", exam.exam_time, "time", false)}
      ${field("Venue", "venue", exam.venue, "text", false)}

      <button class="btn primary full" type="submit">
        ${id ? "Save Changes" : "Publish Examination"}
      </button>
    </form>
  `);

  el("examForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.target);
    const data = {
      name: String(form.get("name")).trim(),
      exam_date: String(form.get("exam_date")),
      exam_time: String(form.get("exam_time")),
      venue: String(form.get("venue")).trim()
    };

    try {
      if (id) {
        await db.collection("exams").doc(id).update(data);
      } else {
        await db.collection("exams").add(data);
      }

      closeModal();
      notify("Examination saved.");
      await render();
    } catch (error) {
      console.error(error);
      notify("Could not save examination.");
    }
  });
}


// --------------------------------
// ADD / EDIT MARKS
// --------------------------------

async function markForm(id = "") {
  if (!canManageStudents()) return;

  const students = await getStudents();

  if (!students.length) {
    return notify("Add a student before entering marks.");
  }

  let mark = {};

  if (id) {
    const doc = await db.collection("marks").doc(id).get();
    if (!doc.exists) return notify("Mark record not found.");
    mark = doc.data();
  }

  openModal(id ? "Edit Marks" : "Add Marks", `
    <form id="markForm">
      <div class="field">
        <label>Student</label>
        <select name="student_doc" required>
          <option value="">Select student</option>
          ${students.map(student => `
            <option
              value="${student.id}"
              ${student.email === mark.student_email ? "selected" : ""}
            >
              ${escapeHTML(student.full_name)} (${escapeHTML(student.student_id)})
            </option>
          `).join("")}
        </select>
      </div>

      ${field("Subject", "subject", mark.subject)}
      ${field("Assessment", "assessment", mark.assessment)}
      ${field("Exam Date", "exam_date", mark.exam_date, "date", false)}
      ${field("Obtained Marks", "obtained_marks", mark.obtained_marks, "number")}
      ${field("Total Marks", "total_marks", mark.total_marks, "number")}

      <button class="btn primary full" type="submit">
        ${id ? "Update Marks" : "Save Marks"}
      </button>
    </form>
  `);

  el("markForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.target);
    const student = students.find(s => s.id === form.get("student_doc"));

    const obtained = Number(form.get("obtained_marks"));
    const total = Number(form.get("total_marks"));

    if (!student) return notify("Please select a student.");
    if (!Number.isFinite(obtained) || !Number.isFinite(total) ||
        total <= 0 || obtained < 0 || obtained > total) {
      return notify("Enter valid marks. Obtained marks cannot exceed total marks.");
    }

    const data = {
      student_email: String(student.email).toLowerCase(),
      student_name: student.full_name,
      student_id: student.student_id,
      subject: String(form.get("subject")).trim(),
      assessment: String(form.get("assessment")).trim(),
      exam_date: String(form.get("exam_date")),
      obtained_marks: obtained,
      total_marks: total
    };

    try {
      if (id) {
        await db.collection("marks").doc(id).update(data);
      } else {
        await db.collection("marks").add(data);
      }

      closeModal();
      notify("Marks saved successfully.");
      await render();
    } catch (error) {
      console.error(error);
      notify("Could not save marks. Check Firestore rules.");
    }
  });
}


// --------------------------------
// ADMIN USER MANAGEMENT
// --------------------------------

async function usersPage() {
  if (!isAdmin()) return "";

  const users = await getUsers();

  const rows = users.map(user => `
    <tr>
      <td><b>${escapeHTML(user.full_name || "User")}</b></td>
      <td>${escapeHTML(user.role || "—")}</td>
      <td>${escapeHTML(user.id)}</td>
      <td>
        ${user.id !== currentUser.uid ? `
          <button class="link" data-action="edit-user" data-id="${user.id}">Change Role</button>
          <button class="link" data-action="delete-user" data-id="${user.id}">Remove Access</button>
        ` : "Current account"}
      </td>
    </tr>
  `).join("");

  return `
    ${heading("User management", "Manage access to the Metron portal.")}
    ${panel("Registered accounts", users.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>NAME</th><th>ROLE</th><th>USER ID</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : emptyMessage("No user accounts found."))}
  `;
}

async function editUserRole(id) {
  if (!isAdmin() || id === currentUser.uid) return;

  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return notify("User not found.");

  const user = doc.data();

  openModal("Change User Role", `
    <form id="userRoleForm">
      <p>${escapeHTML(user.full_name || "User")}</p>
      <div class="field">
        <label>Account Role</label>
        <select name="role" required>
          <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
          <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>Teacher</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </div>
      <button class="btn primary full" type="submit">Save Role</button>
    </form>
  `);

  el("userRoleForm").addEventListener("submit", async event => {
    event.preventDefault();
    const role = new FormData(event.target).get("role");

    try {
      await db.collection("users").doc(id).update({ role });
      closeModal();
      notify("User role updated.");
      await render();
    } catch (error) {
      console.error(error);
      notify("Could not update role.");
    }
  });
}


// --------------------------------
// DASHBOARD
// --------------------------------

async function dashboard() {
  const role = currentProfile.role;
  const [exams, marks] = await Promise.all([getExams(), getMarks()]);

  if (role === "student") {
    return `
      ${heading(
        "Welcome, " + currentProfile.full_name.split(" ")[0],
        "View your upcoming examinations and published marks."
      )}

      <div class="stats">
        ${stat("▦", exams.length, "Examinations")}
        ${stat("▤", marks.length, "Your results")}
      </div>

      ${panel("Upcoming examinations", examTable(exams))}
      ${panel("My marks", marksTable(marks))}
    `;
  }

  const students = await getStudents();

  if (role === "teacher") {
    return `
      ${heading("Faculty dashboard", "Manage students and their assessment marks.")}

      <div class="stats">
        ${stat("♙", students.length, "Students")}
        ${stat("▤", marks.length, "Mark records")}
        ${stat("▦", exams.length, "Examinations")}
      </div>

      ${panel("Quick actions", `
        <button class="btn primary" data-action="add-student">Add Student</button>
        <button class="btn primary" data-action="add-mark">Add Marks</button>
      `)}

      ${panel("Recent marks", marksTable(marks))}
      ${panel("Upcoming examinations", examTable(exams))}
    `;
  }

  return `
    ${heading("Administrator dashboard", "Overall examination portal management.")}

    <div class="stats">
      ${stat("♙", students.length, "Students")}
      ${stat("▤", marks.length, "Mark records")}
      ${stat("▦", exams.length, "Examinations")}
    </div>

    ${panel("Quick actions", `
      <button class="btn primary" data-action="add-student">Add Student</button>
      <button class="btn primary" data-action="add-exam">Add Examination</button>
      <button class="btn primary" data-action="add-mark">Add Marks</button>
    `)}

    ${panel("Recent marks", marksTable(marks.slice(0, 5)))}
    ${panel("Examination timetable", examTable(exams))}
  `;
}


// --------------------------------
// PAGE RENDERING
// --------------------------------

async function render() {
  renderNavigation();

  el("content").innerHTML = emptyMessage("Loading portal information...");

  try {
    if (currentPage === "dashboard") {
      el("content").innerHTML = await dashboard();
      return;
    }

    if (currentPage === "exams") {
      const exams = await getExams();

      el("content").innerHTML = `
        ${heading("Examination schedule", "View examination dates, times and venues.")}
        ${isAdmin() ? `
          <div style="margin-bottom:14px">
            <button class="btn primary" data-action="add-exam">Add Examination</button>
          </div>
        ` : ""}
        ${panel("Published examinations", examTable(exams))}
      `;
      return;
    }

    if (currentPage === "marks") {
      const marks = await getMarks();

      el("content").innerHTML = `
        ${heading(
          currentProfile.role === "student" ? "My results" : "Marks & gradebook",
          "View academic assessment records."
        )}
        ${canManageStudents() ? `
          <div style="margin-bottom:14px">
            <button class="btn primary" data-action="add-mark">Add Marks</button>
          </div>
        ` : ""}
        ${panel("Assessment records", marksTable(marks))}
      `;
      return;
    }

    if (currentPage === "students") {
      if (!canManageStudents()) {
        currentPage = "dashboard";
        return render();
      }

      const students = await getStudents();

      el("content").innerHTML = `
        ${heading("Student directory", "Add, edit and remove student academic records.")}
        <div style="margin-bottom:14px">
          <button class="btn primary" data-action="add-student">Add Student</button>
        </div>
        ${panel("Registered students", studentsTable(students))}
      `;
      return;
    }

    if (currentPage === "users" && isAdmin()) {
      el("content").innerHTML = await usersPage();
      return;
    }

    currentPage = "dashboard";
    return render();

  } catch (error) {
    console.error(error);
    el("content").innerHTML = emptyMessage(
      "Unable to load this page. Check your Firestore rules and try again."
    );
  }
}


// --------------------------------
// BUTTON ACTIONS
// --------------------------------

el("content").addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  try {
    if (action === "add-student" && canManageStudents()) {
      return studentForm();
    }

    if (action === "edit-student" && canManageStudents()) {
      return studentForm(id);
    }

    if (action === "delete-student" && canManageStudents()) {
      if (!confirm("Remove this student record? Their existing marks will also be removed.")) return;

      const marks = await db.collection("marks")
        .where("student_id", "==", (await db.collection("students").doc(id).get()).data().student_id)
        .get();

      const batch = db.batch();
      marks.docs.forEach(doc => batch.delete(doc.ref));
      batch.delete(db.collection("students").doc(id));
      await batch.commit();

      notify("Student and their marks removed.");
      return render();
    }

    if (action === "add-exam" && isAdmin()) {
      return examForm();
    }

    if (action === "edit-exam" && isAdmin()) {
      return examForm(id);
    }

    if (action === "delete-exam" && isAdmin()) {
      if (!confirm("Delete this examination?")) return;
      await db.collection("exams").doc(id).delete();
      notify("Examination deleted.");
      return render();
    }

    if (action === "add-mark" && canManageStudents()) {
      return markForm();
    }

    if (action === "edit-mark" && canManageStudents()) {
      return markForm(id);
    }

    if (action === "delete-mark" && canManageStudents()) {
      if (!confirm("Delete this mark record?")) return;
      await db.collection("marks").doc(id).delete();
      notify("Mark record deleted.");
      return render();
    }

    if (action === "edit-user" && isAdmin()) {
      return editUserRole(id);
    }

    if (action === "delete-user" && isAdmin()) {
      if (!confirm("Remove this user's Metron access? This does not delete their Google account.")) return;
      await db.collection("users").doc(id).delete();
      notify("Metron access removed.");
      return render();
    }

  } catch (error) {
    console.error(error);
    notify("Action failed. Check your Firestore rules.");
  }
});


// --------------------------------
// MOBILE MENU
// --------------------------------

el("menuBtn").addEventListener("click", () => {
  el("sidebar").classList.toggle("open");
});

// RESTORE FIREBASE SESSION
// --------------------------------

auth.onAuthStateChanged(async user => {
  if (authInitialized) return;

  authInitialized = true;

  if (!user || isLoginInProgress) return;

  try {
    const profileSnapshot = await db
      .collection("users")
      .doc(user.uid)
      .get();

    if (!profileSnapshot.exists) {
      console.warn(
        "Metron account needs an approved role. Firebase UID:",
        user.uid
      );

      await auth.signOut();
      return;
    }

    const profile = profileSnapshot.data();

    if (!["student", "teacher", "admin"].includes(profile.role)) {
      await auth.signOut();
      return;
    }

    currentUser = user;

    currentProfile = {
      full_name:
        profile.full_name ||
        user.displayName ||
        user.email ||
        "Metron User",

      role: profile.role,
      student_id: profile.student_id || ""
    };

    selectedRole = profile.role;

    document.querySelectorAll("[data-role]").forEach(option => {
      option.classList.toggle(
        "selected",
        option.dataset.role === selectedRole
      );

      option.setAttribute(
        "aria-pressed",
        String(option.dataset.role === selectedRole)
      );
    });

    el("selectedRoleText").textContent =
      "Signing in as " +
      selectedRole.charAt(0).toUpperCase() +
      selectedRole.slice(1);

    loginToPortal();

  } catch (error) {
    console.error("Could not restore Metron session:", error);
    await auth.signOut();
  }
});
