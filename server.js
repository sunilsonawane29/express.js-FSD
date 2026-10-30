const express = require("express");
const cors = require("cors");
const path = require("path");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static interactive UI if available
app.use(express.static(path.join(__dirname, "public")));

// Mount Users API routes
app.use("/users", userRoutes);

// Root route - Overview and API information
app.get("/api", (req, res) => {
  res.status(200).json({
    status: "online",
    title: "Users Management REST API",
    assignment: "Question 20 - Express.js Users API",
    endpoints: {
      "GET /users": "Retrieve all users (Supports ?fields=name,email)",
      "GET /users/:id": "Retrieve a single user by ID",
      "POST /users": "Create a new user (Body: { name, email, role, age })",
      "PUT /users/:id": "Update existing user by ID (Body: { name, email, ... })",
      "DELETE /users/:id": "Delete a single user by ID",
      "POST /users/bulk": "Bulk add users (Body: array of user objects; returns added and rejected lists with reasons)",
      "DELETE /users": "Bulk delete users (Body: array of IDs e.g. [1, 2] or { ids: [1, 2] })"
    }
  });
});

// Handle 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.originalUrl}' not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred on the server",
    error: err.message
  });
});

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Express Users API Server is running on:`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   API Info: http://localhost:${PORT}/api`);
    console.log(`   Interactive Dashboard: http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}

module.exports = app;
