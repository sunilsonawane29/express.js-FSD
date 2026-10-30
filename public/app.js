// State management
let currentUsers = [];
let selectedUserIds = new Set();
let currentFieldsParam = "";

// DOM Elements
const statTotalUsers = document.getElementById("statTotalUsers");
const statFieldFilter = document.getElementById("statFieldFilter");
const usersTable = document.getElementById("usersTable");
const tableHeaderRow = document.getElementById("tableHeaderRow");
const tableBody = document.getElementById("tableBody");
const checkAll = document.getElementById("checkAll");
const btnDeleteSelected = document.getElementById("btnDeleteSelected");
const selectedCountSpan = document.getElementById("selectedCount");
const jsonViewer = document.getElementById("jsonViewer");
const responseStatusBadge = document.getElementById("responseStatusBadge");
const requestIndicator = document.getElementById("requestIndicator");
const toast = document.getElementById("toast");

// Sample Bulk Add Data for quick demo
const sampleBulkData = [
  {
    name: "Tony Stark",
    email: "ironman@starkindustries.com",
    role: "Lead Engineer",
    age: 48
  },
  {
    name: "John Doe Clone",
    email: "john.doe@example.com",
    role: "Imposter",
    age: 30
  },
  {
    name: "Natasha Romanoff",
    email: "blackwidow@shield.gov",
    role: "Special Agent",
    age: 34
  },
  {
    name: "Malformed User",
    email: "invalid-email-address",
    role: "Tester"
  },
  {
    name: "Tony Double",
    email: "ironman@starkindustries.com",
    role: "Duplicate In Batch"
  }
];

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupEventListeners();
  document.getElementById("bulkJsonInput").value = JSON.stringify(sampleBulkData, null, 2);
  fetchUsers();
});

// Setup tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add("active");
    });
  });
}

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById("btnRefresh").addEventListener("click", () => fetchUsers());
  document.getElementById("btnSeedReset").addEventListener("click", handleSeedReset);
  document.getElementById("btnApplyFields").addEventListener("click", handleApplyFields);
  document.getElementById("btnPresetNameEmail").addEventListener("click", () => {
    document.getElementById("customFields").value = "name,email";
    handleApplyFields();
  });
  document.getElementById("btnClearFilter").addEventListener("click", () => {
    document.getElementById("customFields").value = "";
    document.querySelectorAll(".checkbox-group input[type='checkbox']").forEach(cb => {
      cb.checked = true;
    });
    handleApplyFields();
  });

  // Forms
  document.getElementById("formAddUser").addEventListener("submit", handleAddUser);
  document.getElementById("btnFillBulkSample").addEventListener("click", () => {
    document.getElementById("bulkJsonInput").value = JSON.stringify(sampleBulkData, null, 2);
  });
  document.getElementById("btnSubmitBulkAdd").addEventListener("click", handleSubmitBulkAdd);
  document.getElementById("btnSubmitBulkDelete").addEventListener("click", handleSubmitBulkDelete);

  // Table selection
  checkAll.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    selectedUserIds.clear();
    document.querySelectorAll(".user-row-check").forEach(cb => {
      cb.checked = isChecked;
      if (isChecked) {
        selectedUserIds.add(Number(cb.dataset.id));
      }
    });
    updateSelectedCount();
  });

  btnDeleteSelected.addEventListener("click", handleBulkDeleteSelected);

  // Edit Modal events
  document.getElementById("btnCloseEditModal").addEventListener("click", closeEditModal);
  document.getElementById("btnCancelEdit").addEventListener("click", closeEditModal);
  document.getElementById("formEditUser").addEventListener("submit", handleSaveEdit);
}

// Show Toast
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.borderColor = isError ? "var(--rose)" : "var(--emerald)";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

// Update JSON Inspector
function updateInspector(status, statusText, endpoint, payload) {
  requestIndicator.innerHTML = `Current Endpoint: <code>${endpoint}</code>`;
  responseStatusBadge.textContent = `${status} ${statusText}`;
  responseStatusBadge.className = "status-badge";
  if (status >= 400) {
    responseStatusBadge.classList.add("error");
  } else if (status === 207) {
    responseStatusBadge.classList.add("warn");
  }
  jsonViewer.textContent = JSON.stringify(payload, null, 2);
}

// API: GET /users with projection
async function fetchUsers() {
  let url = "/users";
  const params = [];

  if (currentFieldsParam) {
    params.push(`fields=${encodeURIComponent(currentFieldsParam)}`);
    statFieldFilter.textContent = `?fields=${currentFieldsParam}`;
  } else {
    statFieldFilter.textContent = "All Fields";
  }

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    updateInspector(res.status, res.statusText, `GET ${url}`, data);

    if (res.ok && data.success) {
      currentUsers = data.data;
      statTotalUsers.textContent = data.count !== undefined ? data.count : currentUsers.length;
      renderTable(currentUsers);
    }
  } catch (err) {
    showToast("Failed to fetch users: " + err.message, true);
  }
}

// Handle apply fields
function handleApplyFields() {
  const custom = document.getElementById("customFields").value.trim();
  if (custom) {
    currentFieldsParam = custom;
  } else {
    const checked = Array.from(document.querySelectorAll(".checkbox-group input[type='checkbox']:checked"))
      .map(cb => cb.value);
    
    // If all standard fields are checked, no need for ?fields param
    if (checked.length === 6) {
      currentFieldsParam = "";
    } else {
      currentFieldsParam = checked.join(",");
    }
  }
  fetchUsers();
}

// Render Table dynamically based on returned keys
function renderTable(users) {
  selectedUserIds.clear();
  checkAll.checked = false;
  updateSelectedCount();

  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No users found</td></tr>`;
    return;
  }

  // Detect which columns to display based on fields present
  const sample = users[0] || {};
  const presentKeys = Object.keys(sample);

  // If projection returned specific fields without standard columns, render dynamically
  const isCustomProjection = currentFieldsParam.length > 0;

  if (isCustomProjection) {
    // Dynamic Header
    tableHeaderRow.innerHTML = `
      <th style="width: 40px;"><input type="checkbox" id="checkAll"></th>
      ${presentKeys.map(k => `<th>${k.toUpperCase()}</th>`).join("")}
      <th style="text-align: right;">Actions</th>
    `;
    // Rebind checkAll
    document.getElementById("checkAll").addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      selectedUserIds.clear();
      document.querySelectorAll(".user-row-check").forEach(cb => {
        cb.checked = isChecked;
        if (isChecked && cb.dataset.id) {
          selectedUserIds.add(Number(cb.dataset.id));
        }
      });
      updateSelectedCount();
    });

    // Dynamic Body
    tableBody.innerHTML = users.map(user => {
      const idVal = user.id !== undefined ? user.id : "";
      return `
        <tr>
          <td><input type="checkbox" class="user-row-check" data-id="${idVal}" ${!idVal ? "disabled" : ""}></td>
          ${presentKeys.map(k => `<td>${user[k] !== null && user[k] !== undefined ? escapeHtml(String(user[k])) : "-"}</td>`).join("")}
          <td class="action-cell">
            ${idVal ? `
              <button class="btn-table-action" onclick="openEditModal(${idVal})">Edit</button>
              <button class="btn-table-action btn-del" onclick="handleDeleteSingle(${idVal})">Delete</button>
            ` : `<span style="color: var(--text-muted); font-size: 0.75rem;">(No ID in field filter)</span>`}
          </td>
        </tr>
      `;
    }).join("");
  } else {
    // Standard full view
    tableHeaderRow.innerHTML = `
      <th style="width: 40px;"><input type="checkbox" id="checkAll"></th>
      <th>ID</th>
      <th>Name</th>
      <th>Email</th>
      <th>Role</th>
      <th>Age</th>
      <th style="text-align: right;">Actions</th>
    `;
    document.getElementById("checkAll").addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      selectedUserIds.clear();
      document.querySelectorAll(".user-row-check").forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
          selectedUserIds.add(Number(cb.dataset.id));
        }
      });
      updateSelectedCount();
    });

    tableBody.innerHTML = users.map(user => `
      <tr>
        <td><input type="checkbox" class="user-row-check" data-id="${user.id}"></td>
        <td><code>#${user.id}</code></td>
        <td style="font-weight: 600;">${escapeHtml(user.name || "")}</td>
        <td><code>${escapeHtml(user.email || "")}</code></td>
        <td><span class="tag-badge">${escapeHtml(user.role || "User")}</span></td>
        <td>${user.age !== null && user.age !== undefined ? user.age : "-"}</td>
        <td class="action-cell">
          <button class="btn-table-action" onclick="openEditModal(${user.id})">Edit</button>
          <button class="btn-table-action btn-del" onclick="handleDeleteSingle(${user.id})">Delete</button>
        </td>
      </tr>
    `).join("");
  }

  // Row checkbox changes
  document.querySelectorAll(".user-row-check").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = Number(e.target.dataset.id);
      if (!id) return;
      if (e.target.checked) {
        selectedUserIds.add(id);
      } else {
        selectedUserIds.delete(id);
      }
      updateSelectedCount();
    });
  });
}

function updateSelectedCount() {
  const count = selectedUserIds.size;
  selectedCountSpan.textContent = count;
  btnDeleteSelected.disabled = count === 0;
}

// API: POST /users
async function handleAddUser(e) {
  e.preventDefault();
  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const role = document.getElementById("userRole").value.trim();
  const age = document.getElementById("userAge").value;

  const payload = {
    name,
    email,
    ...(role ? { role } : {}),
    ...(age ? { age: Number(age) } : {})
  };

  try {
    const res = await fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    updateInspector(res.status, res.statusText, "POST /users", data);

    if (res.ok && data.success) {
      showToast(`User '${data.data.name}' added successfully!`);
      document.getElementById("formAddUser").reset();
      fetchUsers();
    } else {
      showToast(data.message || "Error creating user", true);
    }
  } catch (err) {
    showToast("Network error: " + err.message, true);
  }
}

// API: POST /users/bulk
async function handleSubmitBulkAdd() {
  const text = document.getElementById("bulkJsonInput").value.trim();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    showToast("Invalid JSON syntax in Bulk Users textarea!", true);
    return;
  }

  try {
    const res = await fetch("/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    updateInspector(res.status, res.statusText, "POST /users/bulk", data);

    if (res.ok) {
      showToast(`Bulk Processed: ${data.summary.addedCount} added, ${data.summary.rejectedCount} rejected.`);
      fetchUsers();
    } else {
      showToast(data.message || "Failed bulk add", true);
    }
  } catch (err) {
    showToast("Network error: " + err.message, true);
  }
}

// API: DELETE /users/:id
async function handleDeleteSingle(id) {
  if (!confirm(`Are you sure you want to delete user ID #${id}?`)) return;

  try {
    const res = await fetch(`/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    updateInspector(res.status, res.statusText, `DELETE /users/${id}`, data);

    if (res.ok && data.success) {
      showToast(`User #${id} deleted successfully`);
      fetchUsers();
    } else {
      showToast(data.message || "Failed to delete user", true);
    }
  } catch (err) {
    showToast("Network error: " + err.message, true);
  }
}

// API: DELETE /users (Bulk delete by array of IDs in request body)
async function handleSubmitBulkDelete() {
  const input = document.getElementById("bulkDeleteIdsInput").value.trim();
  if (!input) {
    showToast("Please enter IDs to delete", true);
    return;
  }

  let ids;
  if (input.startsWith("[")) {
    try {
      ids = JSON.parse(input);
    } catch (e) {
      showToast("Invalid JSON array of IDs", true);
      return;
    }
  } else {
    ids = input.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    showToast("No valid numeric IDs provided", true);
    return;
  }

  executeBulkDelete(ids);
}

// Delete Selected from table
function handleBulkDeleteSelected() {
  const ids = Array.from(selectedUserIds);
  if (ids.length === 0) return;
  if (!confirm(`Are you sure you want to delete ${ids.length} selected user(s)?`)) return;
  executeBulkDelete(ids);
}

// Send DELETE /users with JSON body
async function executeBulkDelete(ids) {
  try {
    const res = await fetch("/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids)
    });
    const data = await res.json();
    updateInspector(res.status, res.statusText, "DELETE /users", data);

    if (res.ok && data.success) {
      showToast(`Deleted ${data.deletedCount} user(s).`);
      document.getElementById("bulkDeleteIdsInput").value = "";
      fetchUsers();
    } else {
      showToast(data.message || "Error during bulk delete", true);
    }
  } catch (err) {
    showToast("Network error: " + err.message, true);
  }
}

// Edit Modal (PUT /users/:id)
async function openEditModal(id) {
  try {
    const res = await fetch(`/users/${id}`);
    const data = await res.json();
    if (res.ok && data.success) {
      const u = data.data;
      document.getElementById("editUserId").value = u.id;
      document.getElementById("editUserTitleId").textContent = `#${u.id}`;
      document.getElementById("editUserName").value = u.name || "";
      document.getElementById("editUserEmail").value = u.email || "";
      document.getElementById("editUserRole").value = u.role || "";
      document.getElementById("editUserAge").value = u.age !== null ? u.age : "";
      document.getElementById("editModal").classList.remove("hidden");
    } else {
      showToast(data.message || "Could not fetch user details", true);
    }
  } catch (err) {
    showToast("Error loading user: " + err.message, true);
  }
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function handleSaveEdit(e) {
  e.preventDefault();
  const id = document.getElementById("editUserId").value;
  const name = document.getElementById("editUserName").value.trim();
  const email = document.getElementById("editUserEmail").value.trim();
  const role = document.getElementById("editUserRole").value.trim();
  const age = document.getElementById("editUserAge").value;

  const payload = {
    name,
    email,
    role,
    age: age ? Number(age) : null
  };

  try {
    const res = await fetch(`/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    updateInspector(res.status, res.statusText, `PUT /users/${id}`, data);

    if (res.ok && data.success) {
      showToast(`User #${id} updated successfully!`);
      closeEditModal();
      fetchUsers();
    } else {
      showToast(data.message || "Failed to update user", true);
    }
  } catch (err) {
    showToast("Network error: " + err.message, true);
  }
}

// Reset seed endpoint helper
async function handleSeedReset() {
  // Simple reload by calling bulk recreate if needed or triggering reload
  window.location.reload();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Expose openEditModal and handleDeleteSingle to window for onclick handlers
window.openEditModal = openEditModal;
window.handleDeleteSingle = handleDeleteSingle;
