let appointmentsList = [];
let currentFilter = "all";
let currentView = "list";
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let openDropdownId = null;

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const STATUS_CONFIG = {
  pendiente:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)",  label: "Pendiente"  },
  confirmada: { color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)",  label: "Confirmada" },
  cancelada:  { color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   border: "rgba(244,63,94,0.35)",   label: "Cancelada"  }
};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user) { window.location.href = "index.html"; return; }

  const welcomeEl = document.getElementById("welcome");
  if (welcomeEl) {
    welcomeEl.innerHTML = `¡Bienvenido de nuevo, <span class="font-extrabold text-indigo-300">${user.name}</span>! ✨ Administra tus citas agendadas de forma rápida e inteligente.`;
  }

  const profileNameEl  = document.getElementById("profileCardName");
  const profileEmailEl = document.getElementById("profileCardEmail");
  if (profileNameEl)  profileNameEl.textContent  = user.name;
  if (profileEmailEl) profileEmailEl.textContent = user.email;

  document.getElementById("apptForm")?.addEventListener("submit", handleSaveAppointment);
  document.getElementById("clearBtn")?.addEventListener("click", clearApptForm);

  // Cerrar dropdown al hacer click fuera o al hacer scroll
  document.addEventListener("click", closeFloatingDropdown);
  document.addEventListener("scroll", closeFloatingDropdown, true);

  setupFilters();
  setupViewSwitcher();
  fetchAndRenderAppointments();
});

// ─── Floating dropdown (position: fixed para escapar del overflow de la tabla) ─

function getOrCreateFloatingMenu() {
  let menu = document.getElementById("floating-status-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "floating-status-menu";
    menu.style.cssText = `
      position: fixed;
      z-index: 9999;
      display: none;
      min-width: 148px;
      background: rgba(8,12,24,0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 5px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
    `;
    document.body.appendChild(menu);
  }
  return menu;
}

function closeFloatingDropdown() {
  const menu = document.getElementById("floating-status-menu");
  if (menu) menu.style.display = "none";
  openDropdownId = null;
}

window.toggleStatusDropdown = function(e, apptId) {
  e.stopPropagation();
  const menu = getOrCreateFloatingMenu();
  const btn  = e.currentTarget;

  // Si el mismo botón vuelve a hacer click, cierra
  if (openDropdownId === apptId) {
    closeFloatingDropdown();
    return;
  }

  const appt = appointmentsList.find(a => (a._id || a.id) === apptId);
  if (!appt) return;

  // Construir opciones (todos los estados excepto el actual)
  menu.innerHTML = Object.entries(STATUS_CONFIG)
    .filter(([key]) => key !== appt.status)
    .map(([key, c]) => `
      <button
        data-status-key="${key}"
        data-appt-id="${apptId}"
        style="
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 11px;
          background: transparent;
          border: none;
          color: ${c.color};
          font-size: 0.73rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s;
          text-align: left;
        "
        onmouseover="this.style.background='${c.bg}'"
        onmouseout="this.style.background='transparent'"
      >
        <span style="width:7px;height:7px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block;"></span>
        ${c.label}
      </button>
    `).join("");

  // Asignar eventos a cada opción
  menu.querySelectorAll("button[data-status-key]").forEach(optBtn => {
    optBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const newStatus = optBtn.dataset.statusKey;
      const id        = optBtn.dataset.apptId;
      closeFloatingDropdown();
      await changeStatus(id, newStatus);
    });
  });

  // Posicionar el menú justo debajo del botón (position: fixed)
  const rect = btn.getBoundingClientRect();
  menu.style.display = "block";

  // Evitar que se salga por la derecha de la pantalla
  const menuWidth = 148;
  let left = rect.left;
  if (left + menuWidth > window.innerWidth - 8) {
    left = window.innerWidth - menuWidth - 8;
  }

  menu.style.top  = `${rect.bottom + 6}px`;
  menu.style.left = `${left}px`;

  openDropdownId = apptId;
};

async function changeStatus(apptId, newStatus) {
  const appt = appointmentsList.find(a => (a._id || a.id) === apptId);
  if (!appt || appt.status === newStatus) return;

  try {
    await apiFetch(`/api/appointments/${apptId}`, {
      method: "PUT",
      body: { service: appt.service, date: appt.date, status: newStatus, notes: appt.notes },
      auth: true
    });
    showDashboardAlert(`Estado cambiado a "${newStatus}" correctamente.`, "ok");
    await fetchAndRenderAppointments();
  } catch (error) {
    showDashboardAlert("No se pudo cambiar el estado: " + error.message, "err");
  }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function showDashboardAlert(message, type = "ok") {
  const alertEl = document.getElementById("alert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.style.display = "block";
  alertEl.className = "alert " + (type === "ok" ? "ok animate-slide-up" : "err animate-slide-up");
  setTimeout(() => {
    alertEl.style.opacity = "0";
    setTimeout(() => { alertEl.style.display = "none"; alertEl.style.opacity = "1"; }, 400);
  }, 5000);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAndRenderAppointments() {
  try {
    const appointments = await apiFetch("/api/appointments", { auth: true });
    appointmentsList = Array.isArray(appointments) ? appointments : [];
    renderActiveView();
    updateDynamicStats();
  } catch (error) {
    showDashboardAlert("No se pudieron cargar tus citas: " + error.message, "err");
  }
}

function updateDynamicStats() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("profileCardTotal",     appointmentsList.length);
  set("profileCardPending",   appointmentsList.filter(a => a.status === "pendiente").length);
  set("profileCardConfirmed", appointmentsList.filter(a => a.status === "confirmada").length);
  set("profileCardCancelled", appointmentsList.filter(a => a.status === "cancelada").length);
}

function renderActiveView() {
  if (currentView === "calendar") renderCalendarView();
  else renderAppointmentsTable();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatPrettyDate(isoString) {
  try {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("es-ES", {
      weekday: "long", year: "numeric", month: "short",
      day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  } catch { return isoString; }
}

function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  } catch { return isoString.slice(0, 16); }
}

// ─── Status button (solo el trigger, el menú es el div flotante global) ───────

function buildStatusBtn(appt) {
  const apptId = appt._id || appt.id;
  const cfg    = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pendiente;
  return `
    <button
      data-trigger-id="${apptId}"
      onclick="toggleStatusDropdown(event, '${apptId}')"
      title="Cambiar estado"
      style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px 5px 8px;
        border-radius: 999px;
        border: 1px solid ${cfg.border};
        background: ${cfg.bg};
        color: ${cfg.color};
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        cursor: pointer;
        white-space: nowrap;
        transition: filter 0.15s;
      "
      onmouseover="this.style.filter='brightness(1.18)'"
      onmouseout="this.style.filter='brightness(1)'"
    >
      <span style="width:6px;height:6px;border-radius:50%;background:${cfg.color};flex-shrink:0;display:inline-block;"></span>
      ${appt.status}
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="opacity:0.65;flex-shrink:0;">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  `;
}

// ─── Table ────────────────────────────────────────────────────────────────────

function renderAppointmentsTable() {
  const container = document.getElementById("appointmentsContainer");
  if (!container) return;

  const listToRender = currentFilter === "all"
    ? appointmentsList
    : appointmentsList.filter(a => a.status === currentFilter);

  let html = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Fecha y Hora</th>
            <th>Estado</th>
            <th>Notas</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody id="apptTable">
  `;

  if (listToRender.length === 0) {
    html += `
      <tr>
        <td colspan="5" style="padding:40px 0;text-align:center;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:36px;height:36px;color:#64748b;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <p style="font-weight:700;color:white;font-size:0.9rem;">Sin citas disponibles</p>
              <p style="font-size:0.75rem;color:#64748b;margin-top:4px;">No hay citas en este estatus. Crea una nueva en el formulario de la izquierda.</p>
            </div>
          </div>
        </td>
      </tr>
    `;
  } else {
    html += listToRender.map((appt, idx) => {
      const apptId = appt._id || appt.id;
      return `
        <tr
          data-id="${apptId}"
          data-service="${encodeURIComponent(appt.service)}"
          data-date="${appt.date}"
          data-status="${appt.status}"
          data-notes="${encodeURIComponent(appt.notes || '')}"
          style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s;animation:fadeInUp 0.3s ease both ${idx * 0.04}s;"
          onmouseover="this.style.background='rgba(255,255,255,0.02)'"
          onmouseout="this.style.background='transparent'"
        >
          <td style="font-weight:600;color:white;">${appt.service}</td>
          <td style="font-size:0.78rem;font-weight:600;color:#e2e8f0;">${formatPrettyDate(appt.date)}</td>
          <td>${buildStatusBtn(appt)}</td>
          <td style="font-size:0.78rem;color:#94a3b8;max-width:180px;word-break:break-word;">
            ${appt.notes ? appt.notes : '<span style="color:#475569;font-style:italic;">Sin notas</span>'}
          </td>
          <td style="text-align:right;">
            <div style="display:inline-flex;gap:6px;padding:4px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
              <button
                class="btn-action-edit"
                title="Editar cita"
                style="background:transparent;border:none;cursor:pointer;padding:6px 8px;border-radius:8px;color:#818cf8;display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s;"
                onmouseover="this.style.background='rgba(99,102,241,0.15)';this.style.color='white';"
                onmouseout="this.style.background='transparent';this.style.color='#818cf8';"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                class="btn-action-delete"
                title="Eliminar cita"
                style="background:transparent;border:none;cursor:pointer;padding:6px 8px;border-radius:8px;color:#f87171;display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s;"
                onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.color='white';"
                onmouseout="this.style.background='transparent';this.style.color='#f87171';"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // Event listeners para editar / eliminar
  container.querySelectorAll("tr[data-id]").forEach(row => {
    const id      = row.dataset.id;
    const service = decodeURIComponent(row.dataset.service);
    const date    = row.dataset.date;
    const status  = row.dataset.status;
    const notes   = decodeURIComponent(row.dataset.notes);

    row.querySelector(".btn-action-edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      populateEditForm(id, service, date, status, notes);
    });
    row.querySelector(".btn-action-delete")?.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteAppointment(id, service);
    });
  });
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendarView() {
  const container = document.getElementById("appointmentsContainer");
  if (!container) return;

  const listToRender = currentFilter === "all"
    ? appointmentsList
    : appointmentsList.filter(a => a.status === currentFilter);

  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const totalDays     = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  let html = `
    <div class="calendar-navigator">
      <button onclick="changeCalendarMonth(-1)" class="calendar-nav-btn" type="button">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="calendar-month-title">${MONTHS_ES[calendarMonth]} ${calendarYear}</span>
      <button onclick="changeCalendarMonth(1)" class="calendar-nav-btn" type="button">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekday-header">Dom</div>
      <div class="calendar-weekday-header">Lun</div>
      <div class="calendar-weekday-header">Mar</div>
      <div class="calendar-weekday-header">Mié</div>
      <div class="calendar-weekday-header">Jue</div>
      <div class="calendar-weekday-header">Vie</div>
      <div class="calendar-weekday-header">Sáb</div>
  `;

  for (let i = 0; i < firstDayIndex; i++) html += `<div class="calendar-cell empty-day"></div>`;

  const today = new Date();
  const isCurrentMonthYear = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;

  for (let day = 1; day <= totalDays; day++) {
    const isToday  = isCurrentMonthYear && today.getDate() === day;
    const dateStr  = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAppts = listToRender.filter(appt => {
      try {
        const d = new Date(appt.date);
        return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && d.getDate() === day;
      } catch { return false; }
    });

    html += `
      <div class="${isToday ? "calendar-cell today-day" : "calendar-cell"}" onclick="selectCalendarDate('${dateStr}')">
        <span class="calendar-day-number">${day}</span>
        <div class="calendar-events-container">
    `;

    dayAppts.forEach(appt => {
      const apptId   = appt._id || appt.id;
      const badgeTag = appt.status === "confirmada" ? "confirmada" : appt.status === "cancelada" ? "cancelada" : "pendiente";
      html += `<div class="calendar-event ${badgeTag}" data-cal-id="${apptId}" style="cursor:pointer;">${appt.service}</div>`;
    });

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll(".calendar-event[data-cal-id]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const appt = appointmentsList.find(a => (a._id || a.id) === el.dataset.calId);
      if (appt) populateEditForm(appt._id || appt.id, appt.service, appt.date, appt.status, appt.notes || "");
    });
  });
}

window.changeCalendarMonth = function(offset) {
  calendarMonth += offset;
  if (calendarMonth < 0)  { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0;  calendarYear++; }
  renderCalendarView();
};

window.selectCalendarDate = function(dateStr) {
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = `${dateStr}T12:00`;
    showDashboardAlert(`Día seleccionado: ${dateStr}. Completa el servicio y guarda.`, "ok");
    document.getElementById("apptForm").scrollIntoView({ behavior: "smooth" });
  }
};

// ─── Filters & switcher ───────────────────────────────────────────────────────

function setupFilters() {
  document.querySelectorAll(".filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter") || "all";
      renderActiveView();
    });
  });
}

function setupViewSwitcher() {
  const listBtn = document.getElementById("listViewBtn");
  const calBtn  = document.getElementById("calendarViewBtn");
  if (!listBtn || !calBtn) return;
  listBtn.addEventListener("click", () => {
    listBtn.classList.add("active"); calBtn.classList.remove("active");
    currentView = "list"; renderActiveView();
  });
  calBtn.addEventListener("click", () => {
    calBtn.classList.add("active"); listBtn.classList.remove("active");
    currentView = "calendar"; renderActiveView();
  });
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function handleSaveAppointment(e) {
  e.preventDefault();
  const apptId  = document.getElementById("apptId")?.value || "";
  const service = document.getElementById("service")?.value.trim();
  const date    = document.getElementById("date")?.value;
  const status  = document.getElementById("status")?.value;
  const notes   = document.getElementById("notes")?.value.trim() || "";
  const saveBtn = document.getElementById("saveBtn");

  if (!service || !date) { showDashboardAlert("Por favor, ingresa el servicio y la fecha.", "err"); return; }

  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled   = true;
  saveBtn.innerHTML  = `<span class="spinner"></span> Guardando...`;

  try {
    if (apptId) {
      await apiFetch(`/api/appointments/${apptId}`, { method: "PUT", body: { service, date, status, notes }, auth: true });
      showDashboardAlert(`¡Cita "${service}" actualizada!`, "ok");
    } else {
      await apiFetch("/api/appointments", { method: "POST", body: { service, date, status, notes }, auth: true });
      showDashboardAlert(`¡Cita "${service}" reservada con éxito!`, "ok");
    }
    clearApptForm();
    await fetchAndRenderAppointments();
  } catch (error) {
    showDashboardAlert("Error al guardar: " + error.message, "err");
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// ─── Edit / Delete / Clear ────────────────────────────────────────────────────

window.populateEditForm = function(id, service, date, status, notes) {
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
  set("apptId", id);
  set("service", service);
  set("date", toDatetimeLocal(date));
  set("status", status);
  set("notes", notes);

  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.innerHTML = `<span style="display:flex;align-items:center;gap:6px;color:#fbbf24;font-weight:800;"><span class="custom-pulse-dot"></span> Editar Cita</span>`;

  document.querySelectorAll(".floating-group").forEach(group => {
    const input = group.querySelector("input, textarea");
    if (input && input.value) group.classList.add("focused");
  });

  document.getElementById("apptForm").scrollIntoView({ behavior: "smooth" });
};

window.deleteAppointment = async function(id, serviceName) {
  if (!confirm(`¿Eliminar la reserva para "${serviceName}"?`)) return;
  try {
    await apiFetch(`/api/appointments/${id}`, { method: "DELETE", auth: true });
    showDashboardAlert(`Cita "${serviceName}" eliminada.`, "ok");
    await fetchAndRenderAppointments();
  } catch (error) {
    showDashboardAlert("No se pudo eliminar: " + error.message, "err");
  }
};

function clearApptForm() {
  ["apptId","service","date","notes"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  const status = document.getElementById("status"); if (status) status.value = "pendiente";
  const title  = document.getElementById("formTitle"); if (title) title.innerHTML = "Nueva cita";
  document.querySelectorAll(".floating-group").forEach(g => g.classList.remove("focused"));
}