/**
 * Automated Test Suite for Express Users API
 * Run with: npm test (or node test.js)
 */

const http = require("http");
const app = require("./server");
const userModel = require("./models/userModel");

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

// Helper function to make JSON HTTP requests
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const fetchOptions = {
    method: options.method || "GET",
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("🧪 STARTING USERS API TEST SUITE");
  console.log("=================================================\n");

  server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));

  try {
    userModel.resetUsers();

    // 1. GET /users (all users)
    console.log("Test 1: GET /users (Retrieve all users)");
    {
      const res = await request("/users");
      assert(res.status === 200, `Status code is 200 (got ${res.status})`);
      assert(res.data.success === true, "Response success is true");
      assert(Array.isArray(res.data.data), "Data is an array");
      assert(res.data.data.length === 3, "Initial count is 3");
    }

    // 2. GET /users?fields=name,email (field projection)
    console.log("\nTest 2: GET /users?fields=name,email (Projection of selected fields)");
    {
      const res = await request("/users?fields=name,email");
      assert(res.status === 200, "Status is 200");
      assert(res.data.data.length === 3, "Returns 3 users");
      const first = res.data.data[0];
      const keys = Object.keys(first);
      assert(keys.includes("name") && keys.includes("email"), "Contains 'name' and 'email'");
      assert(!keys.includes("role") && !keys.includes("age"), "Does NOT contain 'role' or 'age'");
    }

    // 3. POST /users (Add single user)
    console.log("\nTest 3: POST /users (Add single user)");
    let newUserId;
    {
      const payload = {
        name: "Peter Parker",
        email: "spidey@dailybugle.com",
        role: "Photographer",
        age: 21
      };
      const res = await request("/users", { method: "POST", body: payload });
      assert(res.status === 201, `Status is 201 Created (got ${res.status})`);
      assert(res.data.data.name === "Peter Parker", "Created user name matches");
      assert(res.data.data.email === "spidey@dailybugle.com", "Created user email matches");
      assert(typeof res.data.data.id === "number", "User has numeric ID");
      newUserId = res.data.data.id;
    }

    // 4. POST /users with duplicate email (Conflict check)
    console.log("\nTest 4: POST /users with duplicate email");
    {
      const duplicatePayload = {
        name: "Peter Clone",
        email: "spidey@dailybugle.com"
      };
      const res = await request("/users", { method: "POST", body: duplicatePayload });
      assert(res.status === 409, `Status is 409 Conflict for duplicate email (got ${res.status})`);
      assert(res.data.success === false, "Success is false");
    }

    // 5. GET /users/:id (Find user by ID)
    console.log("\nTest 5: GET /users/:id (Retrieve user by ID)");
    {
      const res = await request(`/users/${newUserId}`);
      assert(res.status === 200, "Status is 200");
      assert(res.data.data.id === newUserId, "Fetched user id matches");
    }

    // 6. PUT /users/:id (Update user by ID)
    console.log("\nTest 6: PUT /users/:id (Update user by ID)");
    {
      const updatePayload = {
        name: "Peter Parker (Avenger)",
        role: "Superhero"
      };
      const res = await request(`/users/${newUserId}`, { method: "PUT", body: updatePayload });
      assert(res.status === 200, "Status is 200");
      assert(res.data.data.name === "Peter Parker (Avenger)", "Name updated successfully");
      assert(res.data.data.role === "Superhero", "Role updated successfully");
    }

    // 7. DELETE /users/:id (Delete user by ID)
    console.log("\nTest 7: DELETE /users/:id (Delete user by ID)");
    {
      const res = await request(`/users/${newUserId}`, { method: "DELETE" });
      assert(res.status === 200, "Status is 200");
      assert(res.data.data.id === newUserId, "Deleted user returned");

      // Verify it's really gone
      const verifyRes = await request(`/users/${newUserId}`);
      assert(verifyRes.status === 404, "Verify user now returns 404 Not Found");
    }

    // 8. POST /users/bulk (Bulk add users with added & rejected tracking)
    console.log("\nTest 8: POST /users/bulk (Bulk add with rejection reasons)");
    {
      const bulkPayload = [
        { name: "Bruce Wayne", email: "batman@waynecorp.com", role: "Executive", age: 35 }, // Valid -> added
        { name: "Clark Kent", email: "john.doe@example.com" }, // Duplicate with DB -> rejected
        { name: "Diana Prince", email: "wonder@themyscira.gov", role: "Ambassador", age: 3000 }, // Valid -> added
        { name: "Invalid Email Guy", email: "not-an-email" }, // Invalid format -> rejected
        { email: "missingname@example.com" }, // Missing name -> rejected
        { name: "Double Agent", email: "batman@waynecorp.com" } // Duplicate within batch -> rejected
      ];

      const res = await request("/users/bulk", { method: "POST", body: bulkPayload });
      assert(res.status === 200, `Status is 200 (got ${res.status})`);
      assert(res.data.summary.totalReceived === 6, "Total received is 6");
      assert(res.data.summary.addedCount === 2, `Added count is 2 (got ${res.data.summary.addedCount})`);
      assert(res.data.summary.rejectedCount === 4, `Rejected count is 4 (got ${res.data.summary.rejectedCount})`);
      assert(res.data.added.length === 2, "Added array has 2 users");
      assert(res.data.rejected.length === 4, "Rejected array has 4 items with reasons");

      // Verify reasons exist
      const reasons = res.data.rejected.map(r => r.reason);
      assert(reasons.some(r => r.includes("already exists in database")), "Contains 'already exists in database' reason");
      assert(reasons.some(r => r.includes("Invalid email format")), "Contains 'Invalid email format' reason");
      assert(reasons.some(r => r.includes("Missing or invalid required field 'name'")), "Contains 'Missing name' reason");
      assert(reasons.some(r => r.includes("duplicated within this bulk request")), "Contains 'duplicated within batch' reason");
    }

    // 9. DELETE /users (Bulk delete by array of IDs)
    console.log("\nTest 9: DELETE /users (Bulk delete by array of IDs)");
    {
      // We know ID 1 and 2 exist from initial seed, ID 999 does not exist
      const deleteBody = [1, 2, 999];
      const res = await request("/users", { method: "DELETE", body: deleteBody });
      assert(res.status === 200, "Status is 200");
      assert(res.data.summary.deletedCount === 2, `Deleted count is 2 (got ${res.data.summary.deletedCount})`);
      assert(res.data.summary.notFoundCount === 1, `Not found count is 1 (got ${res.data.summary.notFoundCount})`);
      assert(res.data.notFoundIds.includes(999), "notFoundIds includes 999");

      // Also test with object wrapper { ids: [...] }
      const deleteBodyObj = { ids: [3] };
      const res2 = await request("/users", { method: "DELETE", body: deleteBodyObj });
      assert(res2.status === 200, "Status is 200 with { ids: [...] } object payload");
      assert(res2.data.summary.deletedCount === 1, "Deleted count is 1");
    }

    console.log("\n=================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
