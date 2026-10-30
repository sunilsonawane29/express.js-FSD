// In-memory data store for users with helper methods

let users = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Admin",
    age: 28,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "Developer",
    age: 25,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: "Alex Johnson",
    email: "alex.j@example.com",
    role: "Designer",
    age: 31,
    createdAt: new Date().toISOString()
  }
];

let nextId = 4;

// Reset store to initial state (useful for tests)
function resetUsers() {
  users = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      role: "Admin",
      age: 28,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      role: "Developer",
      age: 25,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      name: "Alex Johnson",
      email: "alex.j@example.com",
      role: "Designer",
      age: 31,
      createdAt: new Date().toISOString()
    }
  ];
  nextId = 4;
}

// Get all users, optionally filtering by specific fields
function getAll(fields = null) {
  if (!fields) {
    return [...users];
  }

  // Parse comma-separated fields: e.g. "name,email" -> ['name', 'email']
  const requestedFields = fields
    .split(",")
    .map(f => f.trim())
    .filter(Boolean);

  if (requestedFields.length === 0) {
    return [...users];
  }

  return users.map(user => {
    const projected = {};
    for (const field of requestedFields) {
      if (Object.prototype.hasOwnProperty.call(user, field)) {
        projected[field] = user[field];
      }
    }
    return projected;
  });
}

// Find user by ID
function findById(id) {
  const numericId = Number(id);
  return users.find(u => u.id === numericId) || null;
}

// Find user by Email (case-insensitive)
function findByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return users.find(u => u.email.toLowerCase() === normalized) || null;
}

// Add a single user
function create(userData) {
  const newUser = {
    id: nextId++,
    name: userData.name.trim(),
    email: userData.email.trim().toLowerCase(),
    role: userData.role ? userData.role.trim() : "User",
    age: userData.age !== undefined ? Number(userData.age) : null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  return newUser;
}

// Update user by ID
function update(id, updateData) {
  const numericId = Number(id);
  const index = users.findIndex(u => u.id === numericId);

  if (index === -1) {
    return null;
  }

  const existing = users[index];
  const updatedUser = {
    ...existing,
    name: updateData.name !== undefined ? updateData.name.trim() : existing.name,
    email: updateData.email !== undefined ? updateData.email.trim().toLowerCase() : existing.email,
    role: updateData.role !== undefined ? updateData.role.trim() : existing.role,
    age: updateData.age !== undefined ? Number(updateData.age) : existing.age,
    updatedAt: new Date().toISOString()
  };

  users[index] = updatedUser;
  return updatedUser;
}

// Delete user by ID
function deleteById(id) {
  const numericId = Number(id);
  const index = users.findIndex(u => u.id === numericId);

  if (index === -1) {
    return null;
  }

  const [deletedUser] = users.splice(index, 1);
  return deletedUser;
}

// Bulk create users with validation tracking
function bulkCreate(usersArray) {
  const added = [];
  const rejected = [];

  // Track emails within current batch + existing users to catch duplicates inside the batch too
  const registeredEmails = new Set(users.map(u => u.email.toLowerCase()));
  const batchEmails = new Set();

  for (let i = 0; i < usersArray.length; i++) {
    const raw = usersArray[i];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: "Invalid user object format"
      });
      continue;
    }

    if (!raw.name || typeof raw.name !== "string" || !raw.name.trim()) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: "Missing or invalid required field 'name'"
      });
      continue;
    }

    if (!raw.email || typeof raw.email !== "string" || !raw.email.trim()) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: "Missing or invalid required field 'email'"
      });
      continue;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = raw.email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: `Invalid email format: '${raw.email}'`
      });
      continue;
    }

    // Check if duplicate within the same incoming batch
    if (batchEmails.has(normalizedEmail)) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: `Duplicate email: '${raw.email}' duplicated within this bulk request batch`
      });
      continue;
    }

    // Check if email already exists in DB
    if (registeredEmails.has(normalizedEmail)) {
      rejected.push({
        itemIndex: i,
        user: raw,
        reason: `Duplicate email: '${raw.email}' already exists in database`
      });
      continue;
    }

    // Email is valid and unique
    batchEmails.add(normalizedEmail);
    registeredEmails.add(normalizedEmail);

    const newUser = {
      id: nextId++,
      name: raw.name.trim(),
      email: normalizedEmail,
      role: raw.role ? raw.role.trim() : "User",
      age: raw.age !== undefined && raw.age !== null ? Number(raw.age) : null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    added.push(newUser);
  }

  return { added, rejected };
}

// Bulk delete multiple users by array of IDs
function bulkDelete(idsArray) {
  const deletedUsers = [];
  const notFoundIds = [];

  for (const rawId of idsArray) {
    const numericId = Number(rawId);
    if (isNaN(numericId)) {
      notFoundIds.push(rawId);
      continue;
    }

    const index = users.findIndex(u => u.id === numericId);
    if (index !== -1) {
      const [deleted] = users.splice(index, 1);
      deletedUsers.push(deleted);
    } else {
      notFoundIds.push(rawId);
    }
  }

  return { deletedUsers, notFoundIds };
}

module.exports = {
  getAll,
  findById,
  findByEmail,
  create,
  update,
  deleteById,
  bulkCreate,
  bulkDelete,
  resetUsers
};
