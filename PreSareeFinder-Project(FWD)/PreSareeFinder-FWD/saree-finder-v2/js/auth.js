/* ============================================================
   js/auth.js — Authentication & Session Management
   Hyderabad Saree Finder
   ============================================================
   This file handles:
     - Login (user and admin)
     - Signup (new users)
     - Logout
     - Session storage (who is logged in)
     - Route protection (prevent wrong users accessing pages)

   HOW SESSIONS WORK:
     We store the logged-in user in sessionStorage.
     sessionStorage is cleared when the browser tab is closed.
     Key used: "sf_user"  (sf = saree finder)

   PAGE ACCESS RULES:
     - login.html, signup.html     → Public (no login needed)
     - user-dashboard.html, sarees.html, wishlist.html,
       cart.html, checkout.html    → USERS only (role = "user")
     - admin-dashboard.html        → ADMINS only (role = "admin")
   ============================================================ */


/* ----------------------------------------------------------
   SESSION HELPERS
   ---------------------------------------------------------- */

/**
 * Save the logged-in user to sessionStorage.
 * We store only safe fields (never store passwords).
 * @param {Object} user - The user or admin object
 */
function saveSession(user) {
  var safeUser = {
    id:       user.id,
    role:     user.role,        // "user" or "admin"
    name:     user.name,
    email:    user.email,
    store:    user.store    || null,   // only admins have store
    location: user.location || null,
  };
  sessionStorage.setItem("sf_user", JSON.stringify(safeUser));
}


/**
 * Get the currently logged-in user from sessionStorage.
 * Returns null if nobody is logged in.
 * @returns {Object|null}
 */
function getSession() {
  var raw = sessionStorage.getItem("sf_user");
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch (e) { return null; }
}


/**
 * Clear the session (logout).
 */
function clearSession() {
  sessionStorage.removeItem("sf_user");
}


/* ----------------------------------------------------------
   ROUTE PROTECTION
   Call these at the top of each page to block wrong users.
   ---------------------------------------------------------- */

/**
 * Protect a USER page.
 * If not logged in OR logged in as admin → redirect to login.
 * Call this at the top of: user-dashboard, sarees, wishlist, cart, checkout
 */
function requireUser() {
  var session = getSession();
  if (!session || session.role !== "user") {
    // Not a logged-in user → send to login
    window.location.href = "../login.html";
  }
}


/**
 * Protect an ADMIN page.
 * If not logged in OR logged in as user → redirect to login.
 * Call this at the top of: admin-dashboard
 */
function requireAdmin() {
  var session = getSession();
  if (!session || session.role !== "admin") {
    // Not a logged-in admin → send to login
    window.location.href = "../login.html";
  }
}


/**
 * If someone already logged in visits login/signup → redirect them home.
 * Call this on login.html and signup.html.
 */
function redirectIfLoggedIn() {
  var session = getSession();
  if (!session) return; // Not logged in, stay on login page

  if (session.role === "admin") {
    window.location.href = "pages/admin-dashboard.html";
  } else {
    window.location.href = "pages/user-dashboard.html";
  }
}


/* ----------------------------------------------------------
   LOGIN
   ---------------------------------------------------------- */

/**
 * Handle the login form submission.
 * Checks email + password against USERS and ADMINS arrays.
 * Redirects based on role after success.
 */
function handleLogin() {
  var email = document.getElementById("loginEmail").value.trim().toLowerCase();
  var pass  = document.getElementById("loginPass").value;
  var role  = document.getElementById("loginRole").value;  // "user" or "admin"

  // Basic validation
  if (!email || !pass) {
    showFormError("loginError", "Please enter your email and password.");
    return;
  }

  var account = null;

  if (role === "admin") {
    // Search admin accounts
    account = ADMINS.find(function(a) {
      return a.email === email && a.password === pass;
    });
  } else {
    // Search user accounts
    account = USERS.find(function(u) {
      return u.email === email && u.password === pass;
    });
  }

  if (!account) {
    showFormError("loginError", "Incorrect email or password. Please try again.");
    return;
  }

  // ✅ Login success — save session and redirect
  saveSession(account);

  if (account.role === "admin") {
    window.location.href = "pages/admin-dashboard.html";
  } else {
    window.location.href = "pages/user-dashboard.html";
  }
}


/* ----------------------------------------------------------
   SIGNUP
   ---------------------------------------------------------- */

/**
 * Handle the signup form submission.
 * Creates a new user account and logs them in.
 */
function handleSignup() {
  var name   = document.getElementById("signupName").value.trim();
  var email  = document.getElementById("signupEmail").value.trim().toLowerCase();
  var pass   = document.getElementById("signupPass").value;
  var pass2  = document.getElementById("signupPass2").value;
  var phone  = document.getElementById("signupPhone").value.trim();

  // Validate all fields
  if (!name || !email || !pass || !phone) {
    showFormError("signupError", "Please fill in all fields.");
    return;
  }

  if (pass !== pass2) {
    showFormError("signupError", "Passwords do not match.");
    return;
  }

  if (pass.length < 6) {
    showFormError("signupError", "Password must be at least 6 characters.");
    return;
  }

  // Check if email already registered
  var exists = USERS.find(function(u) { return u.email === email; });
  if (exists) {
    showFormError("signupError", "An account with this email already exists.");
    return;
  }

  // Create new user
  var newUser = {
    id:       "u" + Date.now(),
    role:     "user",
    name:     name,
    email:    email,
    password: pass,
    phone:    phone,
  };

  USERS.push(newUser);

  // Auto-login and redirect
  saveSession(newUser);
  window.location.href = "pages/user-dashboard.html";
}


/* ----------------------------------------------------------
   LOGOUT
   ---------------------------------------------------------- */

/**
 * Log out the current user and redirect to login page.
 * Call this from any logout button.
 */
function handleLogout() {
  clearSession();
  window.location.href = "../login.html";
}


/* ----------------------------------------------------------
   NAVBAR: Populate the user name in top-right
   ---------------------------------------------------------- */

/**
 * Update navbar to show "Hello, [Name]" and logout button.
 * Call this on pages that have a nav bar (user + admin pages).
 */
function populateNavUser() {
  var session = getSession();
  if (!session) return;

  var nameEl = document.getElementById("navUserName");
  if (nameEl) {
    nameEl.textContent = "Hello, " + session.name.split(" ")[0];
  }
}


/* ----------------------------------------------------------
   FORM ERROR HELPER
   ---------------------------------------------------------- */

/**
 * Show an error message below a form.
 * @param {string} elementId - ID of the error <p> element
 * @param {string} message   - Error text to show
 */
function showFormError(elementId, message) {
  var el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = "block";
  }
}

/**
 * Clear a form error message.
 * @param {string} elementId
 */
function clearFormError(elementId) {
  var el = document.getElementById(elementId);
  if (el) {
    el.textContent = "";
    el.style.display = "none";
  }
}
