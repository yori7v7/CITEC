// Session protection & check
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const currentPath = window.location.pathname;

  // If we have token and user, and we are on login/register, redirect to dashboard
  if (token && user) {
    if (currentPath.endsWith("index.html") || currentPath.endsWith("register.html") || currentPath === "/" || currentPath.endsWith("/")) {
      window.location.href = "dashboard.html";
    }
  } else {
    // If we do not have a token but are trying to access dashboard
    if (currentPath.endsWith("dashboard.html")) {
      window.location.href = "index.html";
    }
  }

  // Setup logout listener if button exists
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});

// Display custom notifications inside the form's alert node
function showAlert(message, type = "ok") {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;

  alertEl.textContent = message;
  alertEl.style.display = "block";
  
  // Clean classes
  alertEl.className = "alert " + (type === "ok" ? "ok animate-slide-up" : "err animate-slide-up");
  
  // Scroll alert into view comfortably
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlert() {
  const alertEl = document.getElementById("alert");
  if (alertEl) {
    alertEl.style.display = "none";
    alertEl.className = "alert";
  }
}

// Login submission handler
async function handleLogin(e) {
  e.preventDefault();
  clearAlert();

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = e.target.querySelector("button[type='submit']");
  
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAlert("Por favor, ingresa tu correo y contraseña.", "err");
    return;
  }

  // Visual loading feedback to the user
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Ingresando...`;

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false
    });

    if (data && data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      showAlert("¡Ingreso exitoso! Redireccionando...", "ok");
      
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      throw new Error("Respuesta del servidor incompleta.");
    }
  } catch (error) {
    showAlert(error.message || "Error al iniciar sesión. Verifica tus credenciales.", "err");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// Register submission handler
async function handleRegister(e) {
  e.preventDefault();
  clearAlert();

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!nameInput || !emailInput || !passwordInput) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!name || !email || !password) {
    showAlert("Por favor, completa todos los campos requeridos.", "err");
    return;
  }

  if (password.length < 4) {
    showAlert("La contraseña debe tener al menos 4 caracteres.", "err");
    return;
  }

  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Creando cuenta...`;

  try {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false
    });

    if (data && data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      showAlert("¡Cuenta creada con éxito! Redireccionando...", "ok");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } else {
      throw new Error("Respuesta del servidor incompleta.");
    }
  } catch (error) {
    showAlert(error.message || "Error en el registro. Es posible que el correo ya exista.", "err");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// Session clear on logout
function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}
