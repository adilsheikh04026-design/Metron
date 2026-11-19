
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

    throw new Error(
      "This account is not registered in Metron yet. Ask your administrator to add your account."
    );
  }

  const profile = profileSnapshot.data();
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
// DATA PLACEHOLDERS
// --------------------------------
// Authentication is Firebase-only.
// Live exam/student/marks data is not connected yet.

async function getExams() {
  return [];
}


async function getStudents() {
  return [];
}


async function getMarks() {
  return [];
}


// --------------------------------
// TABLE BUILDERS
// --------------------------------

function examTable(exams) {
  if (!exams.length) {
    return emptyMessage(
      "No examination schedules have been published yet."
    );
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
          </tr>
        </thead>

        <tbody>
          ${exams.map(exam => `
            <tr>
              <td><b>${escapeHTML(exam.name)}</b></td>
              <td>${escapeHTML(exam.exam_date)}</td>
              <td>${escapeHTML(exam.exam_time || "—")}</td>
              <td>${escapeHTML(exam.venue || "—")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function marksTable(marks) {
  if (!marks.length) {
    return emptyMessage("No marks have been published yet.");
  }

  const isStudent = currentProfile.role === "student";

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
          </tr>
        </thead>

        <tbody>
          ${marks.map(mark => {
            const percentage = mark.total_marks > 0
              ? Math.round(
                  mark.obtained_marks / mark.total_marks * 100
                )
              : 0;

            return `
              <tr>
                ${!isStudent
                  ? `<td>${escapeHTML(mark.students?.full_name || "—")}</td>`
                  : ""
                }

                <td><b>${escapeHTML(mark.subject)}</b></td>
                <td>${escapeHTML(mark.assessment)}</td>
                <td>${escapeHTML(mark.exam_date || "—")}</td>
                <td>${mark.obtained_marks} / ${mark.total_marks}</td>

                <td>
                  <span class="pill ${percentage >= 40 ? "good" : ""}">
                    ${percentage}%
                  </span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}


// --------------------------------
// DASHBOARD
// --------------------------------

async function dashboard() {
  const role = currentProfile.role;

  const [exams, marks] = await Promise.all([
    getExams(),
    getMarks()
  ]);

  if (role === "student") {
    const average = marks.length
      ? Math.round(
          marks.reduce((sum, mark) =>
            sum + (
              mark.obtained_marks / mark.total_marks * 100
            ), 0
          ) / marks.length
        )
      : 0;

    return `
      ${heading(
        "Welcome, " + currentProfile.full_name.split(" ")[0],
        "Here is your examination portal overview."
      )}

      <div class="hero-card">
        <small>YOUR CURRENT ASSESSMENT AVERAGE</small>
        <h2>${average}%</h2>
        <p>Based on marks published to your student account.</p>
      </div>

      <div class="stats">
        ${stat("▦", exams.length, "Exam schedules")}
        ${stat("▤", marks.length, "Published results")}
        ${stat("♙", "1", "Your student profile")}
      </div>

      <div class="grid2">
        ${panel("My recent results", marksTable(marks.slice(0, 5)))}
        ${panel("Examination timetable", examTable(exams))}
      </div>
    `;
  }

  if (role === "teacher") {
    const students = await getStudents();

    return `
      ${heading(
        "Faculty dashboard",
        "Manage your assessments and student results."
      )}

      <div class="stats">
        ${stat("♙", students.length, "Students")}
        ${stat("▤", marks.length, "Mark records")}
        ${stat("▦", exams.length, "Exam schedules")}
      </div>

      ${panel("Assessment gradebook", marksTable(marks))}
      ${panel("Examination timetable", examTable(exams))}
    `;
  }

  const students = await getStudents();

  return `
    ${heading(
      "Administrator dashboard",
      "Welcome to the central examination management portal."
    )}

    <div class="stats">
      ${stat("♙", students.length, "Students")}
      ${stat("▤", marks.length, "Mark records")}
      ${stat("▦", exams.length, "Exam schedules")}
    </div>

    <div class="grid2">
      ${panel(
        "Latest assessment records",
        marksTable(marks.slice(0, 5))
      )}

      ${panel(
        "Portal administration",
        emptyMessage(
          "Manage users, students, examinations and marks."
        )
      )}
    </div>

    ${panel("Examination timetable", examTable(exams))}
  `;
}


// --------------------------------
// PAGE RENDERING
// --------------------------------

async function render() {
  renderNavigation();

  el("content").innerHTML =
    emptyMessage("Loading portal information...");

  try {
    if (currentPage === "dashboard") {
      el("content").innerHTML = await dashboard();
      return;
    }

    if (currentPage === "exams") {
      const exams = await getExams();

      el("content").innerHTML = `
        ${heading(
          "Examination schedule",
          "View published examination dates, times and venues."
        )}

        ${panel("Published examinations", examTable(exams))}
      `;
      return;
    }

    if (currentPage === "marks") {
      const marks = await getMarks();

      el("content").innerHTML = `
        ${heading(
          currentProfile.role === "student"
            ? "My results"
            : "Marks & gradebook",
          "View academic assessment records."
        )}

        ${panel("Assessment records", marksTable(marks))}
      `;
      return;
    }

    if (currentPage === "students") {
      if (currentProfile.role === "student") {
        currentPage = "dashboard";
        return render();
      }

      const students = await getStudents();

      const table = students.length
        ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STUDENT NAME</th>
                  <th>STUDENT ID</th>
                  <th>COURSE</th>
                  <th>YEAR</th>
                </tr>
              </thead>

              <tbody>
                ${students.map(student => `
                  <tr>
                    <td><b>${escapeHTML(student.full_name)}</b></td>
                    <td>${escapeHTML(student.student_id)}</td>
                    <td>${escapeHTML(student.course || "—")}</td>
                    <td>${escapeHTML(student.year || "—")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `
        : emptyMessage("No students have been registered yet.");

      el("content").innerHTML = `
        ${heading(
          "Student directory",
          "View registered student profiles."
        )}

        ${panel("Registered students", table)}
      `;
      return;
    }

    if (currentPage === "users") {
      el("content").innerHTML = `
        ${heading(
          "User management",
          "Administrator account management."
        )}

        ${panel(
          "Portal accounts",
          emptyMessage(
            "User management will be connected to the secure admin functions."
          )
        )}
      `;
    }

  } catch (error) {
    console.error(error);

    el("content").innerHTML = emptyMessage(
      "Unable to load this page. Please try again."
    );
  }
}


// --------------------------------
// MOBILE MENU AND MODAL
// --------------------------------

el("menuBtn").addEventListener("click", () => {
  el("sidebar").classList.toggle("open");
});


function closeModal() {
  el("modalBg").classList.remove("show");
}

el("modalClose").addEventListener("click", closeModal);

el("modalBg").addEventListener("click", event => {
  if (event.target === el("modalBg")) {
    closeModal();
  }
});


// --------------------------------
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
