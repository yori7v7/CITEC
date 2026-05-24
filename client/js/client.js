// ─── Estado local ───────────────────────────────────────────────────────────
let profilePictureBase64 = ""; // guarda la foto seleccionada en base64

// ─── Inicialización ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Mostrar nombre en el chip superior
  const usernameIndicator = document.getElementById("usernameIndicator");
  const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
  if (usernameIndicator) usernameIndicator.textContent = user.name;
  if (avatarIndicatorTop) avatarIndicatorTop.textContent = user.name.charAt(0).toUpperCase();

  // Cargar datos del perfil desde el servidor
  await loadProfile();

  // Listener: selección de foto
  const picInput = document.getElementById("profilePicInput");
  if (picInput) {
    picInput.addEventListener("change", handlePictureSelected);
  }

  // Listener: guardar perfil
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleSaveProfile);
  }

  // Listener: cambiar contraseña
  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handleChangePassword);
  }

  // Refrescar clases de floating labels después de rellenar campos
  refreshFloatingLabels();
});

// ─── Carga de perfil ─────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const data = await getProfile();

    // Rellenar campos del formulario
    document.getElementById("fullName").value     = data.fullName || "";
    document.getElementById("usernameName").value = data.name    || "";
    document.getElementById("emailField").value   = data.email   || "";
    document.getElementById("phone").value        = data.phone   || "";

    // Mostrar foto de perfil si existe
    if (data.profilePicture) {
      profilePictureBase64 = data.profilePicture;
      showPicturePreview(data.profilePicture);
    }

    // Actualizar avatar del chip con inicial
    const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
    if (avatarIndicatorTop && data.name) {
      avatarIndicatorTop.textContent = data.name.charAt(0).toUpperCase();
    }

    refreshFloatingLabels();
  } catch (error) {
    showProfileAlert("No se pudo cargar tu perfil: " + error.message, "err");
  }
}

// ─── Selección y previsualización de foto ────────────────────────────────────
function handlePictureSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validar que sea imagen
  if (!file.type.startsWith("image/")) {
    showProfileAlert("Solo se permiten archivos de imagen (JPG, PNG, etc.)", "err");
    return;
  }

  // Validar tamaño: máximo 2 MB
  const maxMB = 2;
  if (file.size > maxMB * 1024 * 1024) {
    showProfileAlert(`La imagen no debe superar ${maxMB} MB.`, "err");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    profilePictureBase64 = event.target.result; // data:image/...;base64,...
    showPicturePreview(profilePictureBase64);
  };
  reader.readAsDataURL(file);
}

function showPicturePreview(src) {
  const preview     = document.getElementById("profilePicPreview");
  const placeholder = document.getElementById("profilePicPlaceholder");
  if (preview && placeholder) {
    preview.src               = src;
    preview.style.display     = "block";
    placeholder.style.display = "none";
  }
}

// ─── Guardar perfil ──────────────────────────────────────────────────────────
async function handleSaveProfile(e) {
  e.preventDefault();

  const name     = document.getElementById("usernameName").value.trim();
  const fullName = document.getElementById("fullName").value.trim();
  const phone    = document.getElementById("phone").value.trim();
  const btn      = document.getElementById("saveProfileBtn");

  if (!name) {
    showProfileAlert("El nombre de usuario es obligatorio.", "err");
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando...`;

  try {
    const payload = { name, fullName, phone };

    // Enviar foto si hay una cargada
    if (profilePictureBase64) {
      payload.profilePicture = profilePictureBase64;
    }

    const data = await updateProfile(payload);

    // Actualizar localStorage con el nuevo nombre
    const user = getUser();
    if (user) {
      user.name = data.name;
      localStorage.setItem("user", JSON.stringify(user));
    }

    // Refrescar indicadores visuales
    const usernameIndicator  = document.getElementById("usernameIndicator");
    const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
    if (usernameIndicator)  usernameIndicator.textContent = data.name;
    if (avatarIndicatorTop) avatarIndicatorTop.textContent = data.name.charAt(0).toUpperCase();

    showProfileAlert("✅ Perfil actualizado correctamente.", "ok");
  } catch (error) {
    showProfileAlert("Error al guardar: " + error.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── Cambiar contraseña ──────────────────────────────────────────────────────
async function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword     = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const btn             = document.getElementById("savePasswordBtn");

  if (!currentPassword || !newPassword || !confirmPassword) {
    showProfileAlert("Completa todos los campos de contraseña.", "err");
    return;
  }

  if (newPassword.length < 6) {
    showProfileAlert("La nueva contraseña debe tener al menos 6 caracteres.", "err");
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfileAlert("Las contraseñas nuevas no coinciden.", "err");
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Actualizando...`;

  try {
    await updatePassword({ currentPassword, newPassword });
    showProfileAlert("✅ Contraseña actualizada correctamente.", "ok");

    // Limpiar campos
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value     = "";
    document.getElementById("confirmPassword").value = "";
    refreshFloatingLabels();
  } catch (error) {
    showProfileAlert("Error: " + error.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showProfileAlert(message, type = "ok") {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;
  alertEl.textContent   = message;
  alertEl.style.display = "block";
  alertEl.className     = "alert " + (type === "ok" ? "ok animate-slide-up" : "err animate-slide-up");
  alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });

  setTimeout(() => {
    alertEl.style.opacity = "0";
    setTimeout(() => {
      alertEl.style.display = "none";
      alertEl.style.opacity = "1";
    }, 400);
  }, 5000);
}

function refreshFloatingLabels() {
  document.querySelectorAll(".floating-group input").forEach(el => {
    const group = el.closest(".floating-group");
    if (!group) return;
    if (el.value) {
      group.classList.add("focused");
    } else {
      group.classList.remove("focused");
    }
  });
}