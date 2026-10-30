const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

/**
 * Express User Routes
 *
 * GET    /users          - Get all users (supports ?fields=name,email)
 * POST   /users          - Create single user
 * POST   /users/bulk     - Add multiple users, returns added and rejected (with reasons)
 * DELETE /users          - Remove multiple users by array of IDs in request body
 * GET    /users/:id      - Get single user by ID
 * PUT    /users/:id      - Update user by ID
 * DELETE /users/:id      - Delete single user by ID
 */

// Bulk operations (defined before :id to prevent collision)
router.post("/bulk", userController.bulkCreateUsers);

// Collection operations
router.get("/", userController.getAllUsers);
router.post("/", userController.createUser);
router.delete("/", userController.bulkDeleteUsers);

// Single resource operations
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUserById);

module.exports = router;
