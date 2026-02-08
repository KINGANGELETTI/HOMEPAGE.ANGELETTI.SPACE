/* ===== Storage Helpers ===== */
const Storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

/* ===== Auth Helpers ===== */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getUsers() {
  return Storage.get("homepage_users", {});
}

function saveUsers(users) {
  Storage.set("homepage_users", users);
}

function getCurrentSession() {
  return Storage.get("homepage_session", null);
}

function setCurrentSession(username) {
  Storage.set("homepage_session", username);
}

function clearCurrentSession() {
  Storage.remove("homepage_session");
}

function isLoggedIn() {
  return getCurrentSession() !== null;
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ===== Default Settings ===== */
const DEFAULT_SETTINGS = {
  searchEngine: "google",
  showGreeting: true,
  showDate: true,
  greetingName: "",
  theme: "light",
  accentColor: "#0071e3",
};

const DEFAULT_ACCOUNT = {
  displayName: "",
  email: "",
  bio: "",
  avatarData: "",
};

/* ===== Settings & Account State ===== */
function getSettings() {
  return Storage.get("homepage_settings", { ...DEFAULT_SETTINGS });
}

function saveSettings(settings) {
  Storage.set("homepage_settings", settings);
}

function getAccount() {
  const username = getCurrentSession();
  if (username) {
    return Storage.get("homepage_account_" + username, { ...DEFAULT_ACCOUNT });
  }
  return { ...DEFAULT_ACCOUNT };
}

function saveAccount(account) {
  const username = getCurrentSession();
  if (username) {
    Storage.set("homepage_account_" + username, account);
  }
}

/* ===== Theme ===== */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "");
}

function applyAccentColor(color) {
  if (color) {
    document.documentElement.style.setProperty("--accent", color);
    // Derive a slightly lighter hover variant by adjusting brightness
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const lighter = (c) => Math.min(255, c + 30);
    const hover = `#${lighter(r).toString(16).padStart(2, "0")}${lighter(g).toString(16).padStart(2, "0")}${lighter(b).toString(16).padStart(2, "0")}`;
    document.documentElement.style.setProperty("--accent-hover", hover);
  }
}

/* ===== Init (runs on every page) ===== */
function initGlobal() {
  const settings = getSettings();
  applyTheme(settings.theme);
  applyAccentColor(settings.accentColor);

  // Mark the active nav link
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (path.endsWith(href) || (href === "index.html" && (path === "/" || path.endsWith("/")))) {
      link.classList.add("active");
    }
  });

  // Update nav based on login state
  const loggedIn = isLoggedIn();
  const logoutLink = document.getElementById("nav-logout");
  const loginLink = document.getElementById("nav-login");
  if (logoutLink) logoutLink.style.display = loggedIn ? "" : "none";
  if (loginLink) loginLink.style.display = loggedIn ? "none" : "";

  // Logout handler
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      clearCurrentSession();
      window.location.href = "login.html";
    });
  }
}

/* ===== Toast ===== */
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ===== Search Engine Config ===== */
const SEARCH_ENGINES = {
  google: { name: "Google", url: "https://www.google.com/search?q=" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  yahoo: { name: "Yahoo", url: "https://search.yahoo.com/search?p=" },
  brave: { name: "Brave Search", url: "https://search.brave.com/search?q=" },
};

/* ===== Homepage Logic ===== */
function initHomepage() {
  const settings = getSettings();
  const account = getAccount();
  const username = getCurrentSession();

  // User info display
  const userInfoEl = document.getElementById("user-info");
  const userAvatarImg = document.getElementById("user-avatar");
  const userAvatarPlaceholder = document.getElementById("user-avatar-placeholder");
  const userDisplayName = document.getElementById("user-display-name");

  if (userInfoEl) {
    const displayLabel = account.displayName || username || "";
    if (displayLabel) {
      userInfoEl.style.display = "";
      if (userDisplayName) userDisplayName.textContent = displayLabel;
      if (account.avatarData && userAvatarImg) {
        userAvatarImg.src = account.avatarData;
        userAvatarImg.style.display = "";
        if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = "none";
      } else {
        if (userAvatarImg) userAvatarImg.style.display = "none";
        if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = "";
      }
    }
  }

  // Greeting
  const greetingEl = document.getElementById("greeting");
  const dateEl = document.getElementById("current-date");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const engineLabel = document.getElementById("engine-label");

  if (greetingEl) {
    if (settings.showGreeting) {
      const hour = new Date().getHours();
      let timeGreeting = "Good evening";
      if (hour < 12) timeGreeting = "Good morning";
      else if (hour < 18) timeGreeting = "Good afternoon";

      const name = settings.greetingName || account.displayName || "";
      greetingEl.textContent = name ? `${timeGreeting}, ${name}` : timeGreeting;
      greetingEl.style.display = "";
    } else {
      greetingEl.style.display = "none";
    }
  }

  if (dateEl) {
    if (settings.showDate) {
      dateEl.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      dateEl.style.display = "";
    } else {
      dateEl.style.display = "none";
    }
  }

  // Search
  const engine = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google;
  if (engineLabel) {
    engineLabel.textContent = `Searching with ${engine.name}`;
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.open(engine.url + encodeURIComponent(query), "_blank", "noopener");
      }
    });
  }
}

/* ===== Settings Page Logic ===== */
function initSettings() {
  const settings = getSettings();

  const searchEngineSelect = document.getElementById("search-engine");
  const showGreetingToggle = document.getElementById("show-greeting");
  const showDateToggle = document.getElementById("show-date");
  const greetingNameInput = document.getElementById("greeting-name");
  const themeSelect = document.getElementById("theme");
  const saveBtn = document.getElementById("save-settings");

  // Populate current values
  if (searchEngineSelect) searchEngineSelect.value = settings.searchEngine;
  if (showGreetingToggle) showGreetingToggle.checked = settings.showGreeting;
  if (showDateToggle) showDateToggle.checked = settings.showDate;
  if (greetingNameInput) greetingNameInput.value = settings.greetingName;
  if (themeSelect) themeSelect.value = settings.theme;

  // Accent color swatches
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    if (swatch.dataset.color === settings.accentColor) {
      swatch.classList.add("active");
    }
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
    });
  });

  // Live theme preview
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      applyTheme(themeSelect.value);
    });
  }

  // Save
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const activeSwatch = document.querySelector(".color-swatch.active");
      const updated = {
        searchEngine: searchEngineSelect ? searchEngineSelect.value : settings.searchEngine,
        showGreeting: showGreetingToggle ? showGreetingToggle.checked : settings.showGreeting,
        showDate: showDateToggle ? showDateToggle.checked : settings.showDate,
        greetingName: greetingNameInput ? greetingNameInput.value.trim() : settings.greetingName,
        theme: themeSelect ? themeSelect.value : settings.theme,
        accentColor: activeSwatch ? activeSwatch.dataset.color : settings.accentColor,
      };
      saveSettings(updated);
      applyTheme(updated.theme);
      applyAccentColor(updated.accentColor);
      showToast("Settings saved");
    });
  }
}

/* ===== Account Page Logic ===== */
function initAccount() {
  const account = getAccount();

  const avatarImg = document.getElementById("avatar-img");
  const avatarPlaceholder = document.getElementById("avatar-placeholder");
  const avatarInput = document.getElementById("avatar-input");
  const avatarUploadBtn = document.getElementById("avatar-upload-btn");
  const displayNameInput = document.getElementById("display-name");
  const emailInput = document.getElementById("email");
  const bioInput = document.getElementById("bio");
  const saveBtn = document.getElementById("save-account");
  const resetBtn = document.getElementById("reset-account");

  // Populate
  if (displayNameInput) displayNameInput.value = account.displayName;
  if (emailInput) emailInput.value = account.email;
  if (bioInput) bioInput.value = account.bio;

  function renderAvatar(data) {
    if (data) {
      if (avatarImg) {
        avatarImg.src = data;
        avatarImg.style.display = "";
      }
      if (avatarPlaceholder) avatarPlaceholder.style.display = "none";
    } else {
      if (avatarImg) avatarImg.style.display = "none";
      if (avatarPlaceholder) avatarPlaceholder.style.display = "";
    }
  }

  renderAvatar(account.avatarData);

  // Avatar upload
  if (avatarUploadBtn && avatarInput) {
    avatarUploadBtn.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be under 2 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        renderAvatar(ev.target.result);
        // Temporarily store for save
        avatarInput.dataset.preview = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Save
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const updated = {
        displayName: displayNameInput ? displayNameInput.value.trim() : account.displayName,
        email: emailInput ? emailInput.value.trim() : account.email,
        bio: bioInput ? bioInput.value.trim() : account.bio,
        avatarData: (avatarInput && avatarInput.dataset.preview) || account.avatarData,
      };
      saveAccount(updated);
      showToast("Account saved");
    });
  }

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!window.confirm("Reset all account data? This cannot be undone.")) return;
      saveAccount({ ...DEFAULT_ACCOUNT });
      if (displayNameInput) displayNameInput.value = "";
      if (emailInput) emailInput.value = "";
      if (bioInput) bioInput.value = "";
      renderAvatar("");
      if (avatarInput) avatarInput.dataset.preview = "";
      showToast("Account reset");
    });
  }
}

/* ===== Login / Register Page Logic ===== */
function initLogin() {
  // If already logged in, redirect to homepage
  if (isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  const titleEl = document.getElementById("auth-title");
  const cardTitleEl = document.getElementById("auth-card-title");
  const usernameInput = document.getElementById("auth-username");
  const passwordInput = document.getElementById("auth-password");
  const confirmGroup = document.getElementById("auth-confirm-group");
  const confirmInput = document.getElementById("auth-confirm-password");
  const submitBtn = document.getElementById("auth-submit");
  const errorEl = document.getElementById("auth-error");
  const toggleLabel = document.getElementById("auth-toggle-label");
  const toggleLink = document.getElementById("auth-toggle-link");

  let isRegisterMode = false;

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "";
    }
  }

  function hideError() {
    if (errorEl) errorEl.style.display = "none";
  }

  function updateMode() {
    hideError();
    if (isRegisterMode) {
      if (titleEl) titleEl.textContent = "Create Account";
      if (cardTitleEl) cardTitleEl.textContent = "Create a new account";
      if (confirmGroup) confirmGroup.style.display = "";
      if (submitBtn) submitBtn.textContent = "Create Account";
      if (toggleLabel) toggleLabel.textContent = "Already have an account?";
      if (toggleLink) toggleLink.textContent = "Login";
    } else {
      if (titleEl) titleEl.textContent = "Login";
      if (cardTitleEl) cardTitleEl.textContent = "Sign in to your account";
      if (confirmGroup) confirmGroup.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Login";
      if (toggleLabel) toggleLabel.textContent = "Don't have an account?";
      if (toggleLink) toggleLink.textContent = "Create Account";
    }
  }

  if (toggleLink) {
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      updateMode();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      hideError();
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!username || !password) {
        showError("Please enter both username and password.");
        return;
      }

      if (username.length < 3) {
        showError("Username must be at least 3 characters.");
        return;
      }

      if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
      }

      const users = getUsers();
      const hashedPassword = await hashPassword(password);

      if (isRegisterMode) {
        const confirmPassword = confirmInput ? confirmInput.value : "";
        if (password !== confirmPassword) {
          showError("Passwords do not match.");
          return;
        }
        if (users[username]) {
          showError("Username already exists. Please choose another.");
          return;
        }
        users[username] = { password: hashedPassword };
        saveUsers(users);
        setCurrentSession(username);
        showToast("Account created successfully!");
        window.location.href = "index.html";
      } else {
        if (!users[username]) {
          showError("Invalid username or password.");
          return;
        }
        if (users[username].password !== hashedPassword) {
          showError("Invalid username or password.");
          return;
        }
        setCurrentSession(username);
        showToast("Logged in successfully!");
        window.location.href = "index.html";
      }
    });
  }

  // Allow pressing Enter to submit
  [usernameInput, passwordInput, confirmInput].forEach((input) => {
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && submitBtn) {
          e.preventDefault();
          submitBtn.click();
        }
      });
    }
  });
}

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", () => {
  initGlobal();

  const isLoginPage = !!document.getElementById("auth-submit");

  if (isLoginPage) {
    initLogin();
  } else {
    // All other pages require authentication
    if (!requireAuth()) return;

    if (document.getElementById("search-form")) initHomepage();
    if (document.getElementById("save-settings")) initSettings();
    if (document.getElementById("save-account")) initAccount();
  }
});
