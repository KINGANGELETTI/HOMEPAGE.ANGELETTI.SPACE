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
function generateRecoveryKey() {
  const arr = new Uint16Array(3);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => String(v % 10000).padStart(4, "0")).join(".");
}

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
  const username = getCurrentSession();
  if (username) {
    return Storage.get("homepage_settings_" + username, { ...DEFAULT_SETTINGS });
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  const username = getCurrentSession();
  if (username) {
    Storage.set("homepage_settings_" + username, settings);
  }
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

  // Apps
  initWeatherApp();
  initCalculatorApp();
}

/* ===== Weather App ===== */
const WMO_CODES = {
  0: { desc: "Clear sky", icon: "☀️" },
  1: { desc: "Mainly clear", icon: "🌤️" },
  2: { desc: "Partly cloudy", icon: "⛅" },
  3: { desc: "Overcast", icon: "☁️" },
  45: { desc: "Fog", icon: "🌫️" },
  48: { desc: "Depositing rime fog", icon: "🌫️" },
  51: { desc: "Light drizzle", icon: "🌦️" },
  53: { desc: "Moderate drizzle", icon: "🌦️" },
  55: { desc: "Dense drizzle", icon: "🌧️" },
  61: { desc: "Slight rain", icon: "🌧️" },
  63: { desc: "Moderate rain", icon: "🌧️" },
  65: { desc: "Heavy rain", icon: "🌧️" },
  71: { desc: "Slight snow", icon: "🌨️" },
  73: { desc: "Moderate snow", icon: "🌨️" },
  75: { desc: "Heavy snow", icon: "❄️" },
  80: { desc: "Slight showers", icon: "🌦️" },
  81: { desc: "Moderate showers", icon: "🌧️" },
  82: { desc: "Violent showers", icon: "⛈️" },
  95: { desc: "Thunderstorm", icon: "⛈️" },
  96: { desc: "Thunderstorm with hail", icon: "⛈️" },
  99: { desc: "Thunderstorm with heavy hail", icon: "⛈️" },
};

const CITY_NAMES = {
  "40.7128,-74.006": "New York",
  "34.0522,-118.2437": "Los Angeles",
  "41.8781,-87.6298": "Chicago",
  "29.7604,-95.3698": "Houston",
  "33.749,-84.388": "Atlanta",
  "47.6062,-122.3321": "Seattle",
  "37.7749,-122.4194": "San Francisco",
  "25.7617,-80.1918": "Miami",
  "51.5074,-0.1278": "London",
  "48.8566,2.3522": "Paris",
  "35.6762,139.6503": "Tokyo",
  "55.7558,37.6173": "Moscow",
  "-33.8688,151.2093": "Sydney",
  "19.4326,-99.1332": "Mexico City",
  "52.52,13.405": "Berlin",
};

function initWeatherApp() {
  const modal = document.getElementById("weather-modal");
  const openBtn = document.getElementById("app-weather");
  const closeBtn = document.getElementById("weather-close");
  const locationSelect = document.getElementById("weather-location");
  const currentLocBtn = document.getElementById("weather-current-loc");
  const content = document.getElementById("weather-content");

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  locationSelect.addEventListener("change", () => {
    const val = locationSelect.value;
    if (!val) return;
    const [lat, lon] = val.split(",");
    fetchWeather(lat, lon, CITY_NAMES[val] || "Selected City", content);
  });

  currentLocBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      content.innerHTML = '<p class="weather-error">Geolocation is not supported by your browser.</p>';
      return;
    }
    content.innerHTML = '<p class="weather-loading">Getting your location…</p>';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        locationSelect.value = "";
        fetchWeather(lat, lon, "Current Location", content);
      },
      () => {
        content.innerHTML = '<p class="weather-error">Unable to get your location. Please allow location access or select a city.</p>';
      }
    );
  });
}

function fetchWeather(lat, lon, cityName, container) {
  container.innerHTML = '<p class="weather-loading">Loading weather data…</p>';
  const params = `latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph";
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch weather data");
      return res.json();
    })
    .then((data) => {
      const c = data.current;
      const wmo = WMO_CODES[c.weather_code] || { desc: "Unknown", icon: "🌡️" };
      container.innerHTML =
        '<div class="weather-data">' +
          '<p class="weather-city">' + escapeHTML(cityName) + '</p>' +
          '<div class="weather-main">' +
            '<span class="weather-icon">' + wmo.icon + '</span>' +
            '<span class="weather-temp">' + Math.round(c.temperature_2m) + '°F</span>' +
          '</div>' +
          '<p class="weather-desc">' + escapeHTML(wmo.desc) + '</p>' +
          '<div class="weather-details">' +
            '<div class="weather-detail"><div class="weather-detail-label">Feels Like</div><div class="weather-detail-value">' + Math.round(c.apparent_temperature) + '°F</div></div>' +
            '<div class="weather-detail"><div class="weather-detail-label">Humidity</div><div class="weather-detail-value">' + c.relative_humidity_2m + '%</div></div>' +
            '<div class="weather-detail"><div class="weather-detail-label">Wind</div><div class="weather-detail-value">' + Math.round(c.wind_speed_10m) + ' mph</div></div>' +
            '<div class="weather-detail"><div class="weather-detail-label">Condition</div><div class="weather-detail-value">' + escapeHTML(wmo.desc) + '</div></div>' +
          '</div>' +
        '</div>';
    })
    .catch(() => {
      container.innerHTML = '<p class="weather-error">Could not load weather data. Please try again.</p>';
    });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===== Calculator App ===== */
function initCalculatorApp() {
  const modal = document.getElementById("calc-modal");
  const openBtn = document.getElementById("app-calculator");
  const closeBtn = document.getElementById("calc-close");
  const display = document.getElementById("calc-display");

  if (!modal || !openBtn) return;

  let currentValue = "0";
  let previousValue = null;
  let operator = null;
  let resetNext = false;

  function updateDisplay() {
    display.textContent = currentValue;
  }

  function calculate(a, op, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    switch (op) {
      case "+": return numA + numB;
      case "−": return numA - numB;
      case "×": return numA * numB;
      case "÷": return numB === 0 ? "Error" : numA / numB;
      default: return numB;
    }
  }

  function handleAction(action) {
    // Digits
    if (/^[0-9]$/.test(action)) {
      if (resetNext) {
        currentValue = action;
        resetNext = false;
      } else {
        currentValue = currentValue === "0" ? action : currentValue + action;
      }
      updateDisplay();
      return;
    }

    // Decimal
    if (action === ".") {
      if (resetNext) {
        currentValue = "0.";
        resetNext = false;
      } else if (!currentValue.includes(".")) {
        currentValue += ".";
      }
      updateDisplay();
      return;
    }

    // Clear
    if (action === "clear") {
      currentValue = "0";
      previousValue = null;
      operator = null;
      resetNext = false;
      updateDisplay();
      return;
    }

    // Sign toggle
    if (action === "sign") {
      if (currentValue !== "0" && currentValue !== "Error") {
        currentValue = currentValue.startsWith("-") ? currentValue.slice(1) : "-" + currentValue;
      }
      updateDisplay();
      return;
    }

    // Percent
    if (action === "percent") {
      if (currentValue !== "Error") {
        currentValue = String(parseFloat(currentValue) / 100);
      }
      updateDisplay();
      return;
    }

    // Operators
    if (["+", "−", "×", "÷"].includes(action)) {
      if (previousValue !== null && operator && !resetNext) {
        const result = calculate(previousValue, operator, currentValue);
        currentValue = String(result);
        if (currentValue === "Infinity" || currentValue === "NaN") currentValue = "Error";
      }
      previousValue = currentValue;
      operator = action;
      resetNext = true;
      updateDisplay();
      return;
    }

    // Equals
    if (action === "=") {
      if (previousValue !== null && operator) {
        const result = calculate(previousValue, operator, currentValue);
        currentValue = String(result);
        if (currentValue === "Infinity" || currentValue === "NaN") currentValue = "Error";
        previousValue = null;
        operator = null;
        resetNext = true;
        updateDisplay();
      }
    }
  }

  openBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  modal.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleAction(btn.getAttribute("data-action"));
    });
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "none") return;
    const key = e.key;
    if (/^[0-9]$/.test(key)) { handleAction(key); e.preventDefault(); }
    else if (key === ".") { handleAction("."); e.preventDefault(); }
    else if (key === "+") { handleAction("+"); e.preventDefault(); }
    else if (key === "-") { handleAction("−"); e.preventDefault(); }
    else if (key === "*") { handleAction("×"); e.preventDefault(); }
    else if (key === "/") { handleAction("÷"); e.preventDefault(); }
    else if (key === "Enter" || key === "=") { handleAction("="); e.preventDefault(); }
    else if (key === "Escape") { modal.style.display = "none"; e.preventDefault(); }
    else if (key === "Backspace") { handleAction("clear"); e.preventDefault(); }
  });
}

/* ===== Settings Page Logic (combined with Account) ===== */
function initSettings() {
  const settings = getSettings();
  const account = getAccount();
  const username = getCurrentSession();

  // --- Settings fields ---
  const searchEngineSelect = document.getElementById("search-engine");
  const showGreetingToggle = document.getElementById("show-greeting");
  const showDateToggle = document.getElementById("show-date");
  const greetingNameInput = document.getElementById("greeting-name");
  const themeSelect = document.getElementById("theme");
  const saveSettingsBtn = document.getElementById("save-settings");

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

  // Save settings
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
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

  // --- Account fields ---
  const avatarImg = document.getElementById("avatar-img");
  const avatarPlaceholder = document.getElementById("avatar-placeholder");
  const avatarInput = document.getElementById("avatar-input");
  const avatarUploadBtn = document.getElementById("avatar-upload-btn");
  const displayNameInput = document.getElementById("display-name");
  const emailInput = document.getElementById("email");
  const bioInput = document.getElementById("bio");
  const saveAccountBtn = document.getElementById("save-account");
  const resetBtn = document.getElementById("reset-account");

  // Populate account fields
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
        avatarInput.dataset.preview = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Save account
  if (saveAccountBtn) {
    saveAccountBtn.addEventListener("click", () => {
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

  // Reset account
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

  // --- Recovery key display & regeneration ---
  const recoveryKeyDisplay = document.getElementById("recovery-key-value");
  const regenerateBtn = document.getElementById("regenerate-recovery-key");

  if (recoveryKeyDisplay && username) {
    const users = getUsers();
    if (users[username]) {
      recoveryKeyDisplay.textContent = users[username].recoveryKey;
    }
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", () => {
      if (!window.confirm("Generate a new recovery key? Your old key will no longer work.")) return;
      const users = getUsers();
      if (username && users[username]) {
        const newKey = generateRecoveryKey();
        users[username].recoveryKey = newKey;
        saveUsers(users);
        if (recoveryKeyDisplay) recoveryKeyDisplay.textContent = newKey;
        showToast("Recovery key regenerated");
      }
    });
  }
}

/* ===== Recovery Key Modal ===== */
function showRecoveryKeyModal(recoveryKey) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const title = document.createElement("h2");
  title.className = "modal-title";
  title.textContent = "Save Your Recovery Key";

  const text = document.createElement("p");
  text.className = "modal-text";
  text.textContent = "Write down this recovery key and keep it safe. You will need it to recover your password.";

  const keyDisplay = document.createElement("div");
  keyDisplay.className = "recovery-key-display";
  keyDisplay.textContent = recoveryKey;

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-primary btn-block";
  closeBtn.textContent = "I've saved my key";

  modal.appendChild(title);
  modal.appendChild(text);
  modal.appendChild(keyDisplay);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", function () {
    overlay.remove();
    window.location.href = "index.html";
  });
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
  const recoveryGroup = document.getElementById("auth-recovery-group");
  const recoveryInput = document.getElementById("auth-recovery-key");
  const newPasswordGroup = document.getElementById("auth-new-password-group");
  const newPasswordInput = document.getElementById("auth-new-password");
  const submitBtn = document.getElementById("auth-submit");
  const errorEl = document.getElementById("auth-error");
  const toggleLabel = document.getElementById("auth-toggle-label");
  const toggleLink = document.getElementById("auth-toggle-link");
  const forgotLink = document.getElementById("auth-forgot-link");
  const adminLink = document.getElementById("auth-admin-link");

  let isRegisterMode = false;
  let isRecoverMode = false;
  let isAdminMode = false;

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
    if (isAdminMode) {
      if (titleEl) titleEl.textContent = "Admin Login";
      if (cardTitleEl) cardTitleEl.textContent = "Enter admin password";
      if (usernameInput) usernameInput.parentElement.style.display = "none";
      if (confirmGroup) confirmGroup.style.display = "none";
      if (recoveryGroup) recoveryGroup.style.display = "none";
      if (newPasswordGroup) newPasswordGroup.style.display = "none";
      if (passwordInput) {
        passwordInput.parentElement.style.display = "";
        passwordInput.placeholder = "Admin password";
      }
      if (forgotLink) forgotLink.style.display = "none";
      if (adminLink) adminLink.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Login as Admin";
      if (toggleLabel) toggleLabel.textContent = "Back to";
      if (toggleLink) toggleLink.textContent = "User Login";
    } else if (isRecoverMode) {
      if (titleEl) titleEl.textContent = "Recover Password";
      if (cardTitleEl) cardTitleEl.textContent = "Reset your password";
      if (usernameInput) usernameInput.parentElement.style.display = "";
      if (confirmGroup) confirmGroup.style.display = "none";
      if (recoveryGroup) recoveryGroup.style.display = "";
      if (newPasswordGroup) newPasswordGroup.style.display = "";
      if (passwordInput) {
        passwordInput.parentElement.style.display = "none";
        passwordInput.placeholder = "Enter your password";
      }
      if (forgotLink) forgotLink.style.display = "none";
      if (adminLink) adminLink.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Reset Password";
      if (toggleLabel) toggleLabel.textContent = "Back to";
      if (toggleLink) toggleLink.textContent = "Login";
    } else if (isRegisterMode) {
      if (titleEl) titleEl.textContent = "Create Account";
      if (cardTitleEl) cardTitleEl.textContent = "Create a new account";
      if (usernameInput) usernameInput.parentElement.style.display = "";
      if (confirmGroup) confirmGroup.style.display = "";
      if (recoveryGroup) recoveryGroup.style.display = "none";
      if (newPasswordGroup) newPasswordGroup.style.display = "none";
      if (passwordInput) {
        passwordInput.parentElement.style.display = "";
        passwordInput.placeholder = "Enter your password";
      }
      if (forgotLink) forgotLink.style.display = "none";
      if (adminLink) adminLink.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Create Account";
      if (toggleLabel) toggleLabel.textContent = "Already have an account?";
      if (toggleLink) toggleLink.textContent = "Login";
    } else {
      if (titleEl) titleEl.textContent = "Login";
      if (cardTitleEl) cardTitleEl.textContent = "Sign in to your account";
      if (usernameInput) usernameInput.parentElement.style.display = "";
      if (confirmGroup) confirmGroup.style.display = "none";
      if (recoveryGroup) recoveryGroup.style.display = "none";
      if (newPasswordGroup) newPasswordGroup.style.display = "none";
      if (passwordInput) {
        passwordInput.parentElement.style.display = "";
        passwordInput.placeholder = "Enter your password";
      }
      if (forgotLink) forgotLink.style.display = "";
      if (adminLink) adminLink.style.display = "";
      if (submitBtn) submitBtn.textContent = "Login";
      if (toggleLabel) toggleLabel.textContent = "Don't have an account?";
      if (toggleLink) toggleLink.textContent = "Create Account";
    }
  }

  if (toggleLink) {
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (isRecoverMode || isAdminMode) {
        isRecoverMode = false;
        isRegisterMode = false;
        isAdminMode = false;
      } else {
        isRegisterMode = !isRegisterMode;
      }
      updateMode();
    });
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      isRecoverMode = true;
      isRegisterMode = false;
      isAdminMode = false;
      updateMode();
    });
  }

  if (adminLink) {
    adminLink.addEventListener("click", (e) => {
      e.preventDefault();
      isAdminMode = true;
      isRegisterMode = false;
      isRecoverMode = false;
      updateMode();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      hideError();

      if (isAdminMode) {
        const password = passwordInput ? passwordInput.value : "";
        if (!password) {
          showError("Please enter the admin password.");
          return;
        }
        const ADMIN_HASH = "295cf3ad93f2babb76f750be5e944d355b94f3c71340b789c6d830217720bcfd";
        const hashedInput = await hashPassword(password);
        if (hashedInput !== ADMIN_HASH) {
          showError("Invalid admin password.");
          return;
        }
        Storage.set("homepage_admin_session", true);
        showToast("Admin login successful!");
        window.location.href = "admin.html";
        return;
      }

      const username = usernameInput ? usernameInput.value.trim() : "";

      if (isRecoverMode) {
        const recoveryKey = recoveryInput ? recoveryInput.value.trim() : "";
        const newPassword = newPasswordInput ? newPasswordInput.value : "";

        if (!username || !recoveryKey || !newPassword) {
          showError("Please fill in all fields.");
          return;
        }
        if (newPassword.length < 6) {
          showError("New password must be at least 6 characters.");
          return;
        }
        const users = getUsers();
        if (!users[username] || users[username].recoveryKey !== recoveryKey) {
          showError("Invalid username or recovery key.");
          return;
        }
        const hashedPassword = await hashPassword(newPassword);
        users[username].password = hashedPassword;
        saveUsers(users);
        showToast("Password reset successfully!");
        isRecoverMode = false;
        updateMode();
        return;
      }

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
        const recoveryKey = generateRecoveryKey();
        users[username] = { password: hashedPassword, recoveryKey: recoveryKey };
        saveUsers(users);
        setCurrentSession(username);
        showRecoveryKeyModal(recoveryKey);
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
  [usernameInput, passwordInput, confirmInput, recoveryInput, newPasswordInput].forEach((input) => {
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

/* ===== Admin Dashboard Logic ===== */
function initAdmin() {
  // Check admin session
  if (!Storage.get("homepage_admin_session", false)) {
    window.location.href = "login.html";
    return;
  }

  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Storage.remove("homepage_admin_session");
      window.location.href = "login.html";
    });
  }

  const userListEl = document.getElementById("admin-user-list");
  const noUsersEl = document.getElementById("admin-no-users");
  const modalOverlay = document.getElementById("admin-modal-overlay");
  const modalTitle = document.getElementById("admin-modal-title");
  const modalText = document.getElementById("admin-modal-text");
  const modalBody = document.getElementById("admin-modal-body");
  const modalCancel = document.getElementById("admin-modal-cancel");
  const modalConfirm = document.getElementById("admin-modal-confirm");

  function closeModal() {
    if (modalOverlay) modalOverlay.style.display = "none";
  }

  if (modalCancel) modalCancel.addEventListener("click", closeModal);

  function renderUsers() {
    const users = getUsers();
    const usernames = Object.keys(users);

    if (!userListEl) return;
    userListEl.innerHTML = "";

    if (usernames.length === 0) {
      if (noUsersEl) noUsersEl.style.display = "";
      return;
    }
    if (noUsersEl) noUsersEl.style.display = "none";

    usernames.forEach((username) => {
      const row = document.createElement("div");
      row.className = "admin-user-row";

      const nameSpan = document.createElement("span");
      nameSpan.className = "admin-user-name";
      nameSpan.textContent = username;

      const actions = document.createElement("div");
      actions.className = "admin-user-actions";

      // View Recovery Key button
      const viewKeyBtn = document.createElement("button");
      viewKeyBtn.className = "btn btn-secondary btn-sm";
      viewKeyBtn.textContent = "Recovery Key";
      viewKeyBtn.addEventListener("click", () => {
        if (modalOverlay && modalTitle && modalText && modalBody && modalConfirm) {
          modalTitle.textContent = "Recovery Key";
          modalText.textContent = "Recovery key for " + username + ":";
          modalBody.innerHTML = "";
          const keyDisplay = document.createElement("div");
          keyDisplay.className = "recovery-key-display";
          keyDisplay.textContent = users[username].recoveryKey;
          modalBody.appendChild(keyDisplay);
          modalConfirm.textContent = "Close";
          modalConfirm.onclick = closeModal;
          modalOverlay.style.display = "";
        }
      });

      // Change Password button
      const changePwBtn = document.createElement("button");
      changePwBtn.className = "btn btn-primary btn-sm";
      changePwBtn.textContent = "Change Password";
      changePwBtn.addEventListener("click", () => {
        if (modalOverlay && modalTitle && modalText && modalBody && modalConfirm) {
          modalTitle.textContent = "Change Password";
          modalText.textContent = "Set a new password for " + username + ":";
          modalBody.innerHTML = "";
          const input = document.createElement("input");
          input.type = "password";
          input.className = "form-input";
          input.placeholder = "New password";
          input.id = "admin-new-pw";
          modalBody.appendChild(input);
          modalConfirm.textContent = "Change Password";
          modalConfirm.onclick = async () => {
            const newPw = input.value;
            if (!newPw || newPw.length < 6) {
              showToast("Password must be at least 6 characters.");
              return;
            }
            const currentUsers = getUsers();
            currentUsers[username].password = await hashPassword(newPw);
            saveUsers(currentUsers);
            closeModal();
            showToast("Password changed for " + username);
          };
          modalOverlay.style.display = "";
        }
      });

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger btn-sm";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (modalOverlay && modalTitle && modalText && modalBody && modalConfirm) {
          modalTitle.textContent = "Delete User";
          modalText.textContent = "Are you sure you want to delete the account \"" + username + "\"? This cannot be undone.";
          modalBody.innerHTML = "";
          modalConfirm.textContent = "Delete";
          modalConfirm.onclick = () => {
            const currentUsers = getUsers();
            delete currentUsers[username];
            saveUsers(currentUsers);
            // Clean up user data
            Storage.remove("homepage_settings_" + username);
            Storage.remove("homepage_account_" + username);
            // If the deleted user is currently logged in, clear their session
            if (getCurrentSession() === username) {
              clearCurrentSession();
            }
            closeModal();
            showToast("User " + username + " deleted");
            renderUsers();
          };
          modalOverlay.style.display = "";
        }
      });

      actions.appendChild(viewKeyBtn);
      actions.appendChild(changePwBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(nameSpan);
      row.appendChild(actions);
      userListEl.appendChild(row);
    });
  }

  renderUsers();
}

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", () => {
  initGlobal();

  const isLoginPage = !!document.getElementById("auth-submit");
  const isAdminPage = !!document.getElementById("admin-user-list");

  if (isLoginPage) {
    initLogin();
  } else if (isAdminPage) {
    initAdmin();
  } else {
    // All other pages require authentication
    if (!requireAuth()) return;

    if (document.getElementById("search-form")) initHomepage();
    if (document.getElementById("save-settings")) initSettings();
  }
});
