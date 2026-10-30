const userModel = require("../models/userModel");

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /users
 * Supports ?fields=name,email to return only selected fields
 */
function getAllUsers(req, res) {
  try {
    const { fields } = req.query;
    const users = userModel.getAll(fields);

    return res.status(200).json({
      success: true,
      count: users.length,
      fieldsApplied: fields ? fields.split(",").map(f => f.trim()) : "all",
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching users",
      error: error.message
    });
  }
}

/**
 * GET /users/:id
 * Retrieve a single user by ID
 */
function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with id ${id} not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user",
      error: error.message
    });
  }
}

/**
 * POST /users
 * Create a single user
 */
function createUser(req, res) {
  try {
    const { name, email, role, age } = req.body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Field 'name' is required and must be a non-empty string"
      });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Field 'email' is required and must be a non-empty string"
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: `Invalid email format: '${email}'`
      });
    }

    // Check duplicate email
    const existingUser = userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Duplicate email: User with email '${email}' already exists`
      });
    }

    const newUser = userModel.create({ name, email, role, age });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating user",
      error: error.message
    });
  }
}

/**
 * PUT /users/:id
 * Update user by ID
 */
function updateUser(req, res) {
  try {
    const { id } = req.params;
    const existingUser = userModel.findById(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: `User with id ${id} not found`
      });
    }

    const { name, email, role, age } = req.body;

    // If updating email, validate format & check uniqueness
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Field 'email' must be a non-empty string"
        });
      }

      if (!EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: `Invalid email format: '${email}'`
        });
      }

      const emailOwner = userModel.findByEmail(email);
      if (emailOwner && emailOwner.id !== existingUser.id) {
        return res.status(409).json({
          success: false,
          message: `Duplicate email: Email '${email}' is already taken by another user`
        });
      }
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Field 'name' must be a non-empty string"
      });
    }

    const updatedUser = userModel.update(id, { name, email, role, age });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating user",
      error: error.message
    });
  }
}

/**
 * DELETE /users/:id
 * Delete a user by ID
 */
function deleteUserById(req, res) {
  try {
    const { id } = req.params;
    const deletedUser = userModel.deleteById(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: `User with id ${id} not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: `User with id ${id} deleted successfully`,
      data: deletedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting user",
      error: error.message
    });
  }
}

/**
 * POST /users/bulk
 * Accepts an array of users and returns which users were added and which were rejected (with reasons such as duplicate email)
 */
function bulkCreateUsers(req, res) {
  try {
    // Support either [ ... ] or { users: [ ... ] }
    let rawList = req.body;
    if (rawList && Array.isArray(rawList.users)) {
      rawList = rawList.users;
    }

    if (!Array.isArray(rawList)) {
      return res.status(400).json({
        success: false,
        message: "Request body must be an array of user objects, e.g. [ { name, email }, ... ] or { users: [ ... ] }"
      });
    }

    if (rawList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Users array cannot be empty"
      });
    }

    const { added, rejected } = userModel.bulkCreate(rawList);

    return res.status(200).json({
      success: true,
      message: "Bulk user creation processed",
      summary: {
        totalReceived: rawList.length,
        addedCount: added.length,
        rejectedCount: rejected.length
      },
      added,
      rejected
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during bulk create",
      error: error.message
    });
  }
}

/**
 * DELETE /users
 * Removes multiple users by an array of IDs in request body
 */
function bulkDeleteUsers(req, res) {
  try {
    // Support either [ 1, 2 ] or { ids: [ 1, 2 ] }
    let ids = req.body;
    if (ids && Array.isArray(ids.ids)) {
      ids = ids.ids;
    }

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: "Request body must contain an array of IDs, e.g. [1, 2, 3] or { ids: [1, 2, 3] }"
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array cannot be empty"
      });
    }

    const { deletedUsers, notFoundIds } = userModel.bulkDelete(ids);

    return res.status(200).json({
      success: true,
      message: `Bulk delete processed. Deleted ${deletedUsers.length} user(s).`,
      summary: {
        totalRequested: ids.length,
        deletedCount: deletedUsers.length,
        notFoundCount: notFoundIds.length
      },
      deletedUsers,
      notFoundIds
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error during bulk delete",
      error: error.message
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUserById,
  bulkCreateUsers,
  bulkDeleteUsers
};
