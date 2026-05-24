const API_BASE = "";

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.message || `Error HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// Profile API Functions
async function getProfile() {
  return apiFetch("/api/profile", { auth: true });
}

async function updateProfile(profileData) {
  return apiFetch("/api/profile", {
    method: "PUT",
    body: profileData,
    auth: true
  });
}

async function updatePassword(passwordData) {
  return apiFetch("/api/profile/password", {
    method: "PUT",
    body: passwordData,
    auth: true
  });
}

