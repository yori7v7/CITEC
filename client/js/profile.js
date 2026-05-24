// ─── Estado local ─────────────────────────────────────────────────────────────
let profilePictureBase64 = "";

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Mostrar nombre inicial en chip (antes de cargar del servidor)
  const usernameIndicator = document.getElementById("usernameIndicator");
  const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
  if (usernameIndicator) usernameIndicator.textContent = user.name;
  if (avatarIndicatorTop) avatarIndicatorTop.textContent = user.name.charAt(0).toUpperCase();

  await loadProfile();

  const picInput = document.getElementById("profilePicInput");
  if (picInput) picInput.addEventListener("change", handlePictureSelected);

  const profileForm = document.getElementById("profileForm");
  if (profileForm) profileForm.addEventListener("submit", handleSaveProfile);

  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) passwordForm.addEventListener("submit", handleChangePassword);
});

// ─── Carga de perfil desde el servidor ───────────────────────────────────────
async function loadProfile() {
  try {
    const data = await getProfile();

    // Rellenar campos
    setValue("fullName",     data.fullName || "");
    setValue("usernameName", data.name     || "");
    setValue("emailField",   data.email    || "");  // FIX: ahora sí se rellena
    setValue("phone",        data.phone    || "");

    // Mostrar foto si existe
    if (data.profilePicture) {
      profilePictureBase64 = data.profilePicture;
      showPicturePreview(data.profilePicture);
    }

    // Actualizar chip superior con datos reales del servidor
    const usernameIndicator  = document.getElementById("usernameIndicator");
    const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
    if (usernameIndicator && data.name)  usernameIndicator.textContent = data.name;
    if (avatarIndicatorTop && data.name) avatarIndicatorTop.textContent = data.name.charAt(0).toUpperCase();

    refreshFloatingLabels();
  } catch (error) {
    showProfileAlert("No se pudo cargar tu perfil: " + error.message, "err");
  }
}

// ─── Foto de perfil ───────────────────────────────────────────────────────────
function handlePictureSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showProfileAlert("Solo se permiten archivos de imagen (JPG, PNG, etc.)", "err");
    return;
  }

  // FIX: límite bajado a 1.5 MB para que base64 no supere los 10mb del servidor
  const maxMB = 1.5;
  if (file.size > maxMB * 1024 * 1024) {
    showProfileAlert(`La imagen no debe superar ${maxMB} MB. Elige una más pequeña o recórtala antes.`, "err");
    e.target.value = ""; // limpiar selección
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    profilePictureBase64 = event.target.result;
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

// ─── Guardar perfil ───────────────────────────────────────────────────────────
async function handleSaveProfile(e) {
  e.preventDefault();

  const name     = (document.getElementById("usernameName")?.value || "").trim();
  const fullName = (document.getElementById("fullName")?.value     || "").trim();
  const phone    = (document.getElementById("phone")?.value        || "").trim();
  const btn      = document.getElementById("saveProfileBtn");

  if (!name) {
    showProfileAlert("El nombre de usuario es obligatorio.", "err");
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner"></span> Guardando...`;

  try {
    const payload = { name, fullName, phone };
    if (profilePictureBase64) payload.profilePicture = profilePictureBase64;

    const data = await updateProfile(payload);

    // Actualizar localStorage
    const user = getUser();
    if (user) {
      user.name = data.name;
      localStorage.setItem("user", JSON.stringify(user));
    }

    // Refrescar indicadores
    const usernameIndicator  = document.getElementById("usernameIndicator");
    const avatarIndicatorTop = document.getElementById("avatarIndicatorTop");
    if (usernameIndicator)  usernameIndicator.textContent = data.name;
    if (avatarIndicatorTop) avatarIndicatorTop.textContent = data.name.charAt(0).toUpperCase();

    showProfileAlert("✅ Perfil actualizado correctamente.", "ok");
  } catch (error) {
    showProfileAlert("Error al guardar: " + error.message, "err");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────
async function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword")?.value || "";
  const newPassword     = document.getElementById("newPassword")?.value     || "";
  const confirmPassword = document.getElementById("confirmPassword")?.value || "";
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
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner"></span> Actualizando...`;

  try {
    await updatePassword({ currentPassword, newPassword });
    showProfileAlert("✅ Contraseña actualizada correctamente.", "ok");
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value     = "";
    document.getElementById("confirmPassword").value = "";
    refreshFloatingLabels();
  } catch (error) {
    showProfileAlert("Error: " + error.message, "err");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

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
    el.value ? group.classList.add("focused") : group.classList.remove("focused");
  });
}