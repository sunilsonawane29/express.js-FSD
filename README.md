# Express.js Users Management REST API

> **Assignment Solution (Question #20)**  
> *Create an Express.js users API with get all, add, update by id and delete by id. Add POST /users/bulk that accepts an array of users and returns which users were added and which were rejected (with reasons such as duplicate email), DELETE /users that removes multiple users by an array of ids in the request body, and support ?fields=name,email on GET /users to return only selected fields.*

---

## 🚀 Key Features

1. **Standard CRUD Operations**:
   - `GET /users` - Retrieve all users.
   - `GET /users/:id` - Retrieve user by numeric ID.
   - `POST /users` - Add a new user with email uniqueness check and format validation.
   - `PUT /users/:id` - Update user details by ID with duplicate email prevention.
   - `DELETE /users/:id` - Delete a user by ID.

2. **Field Projection (`?fields=name,email`)**:
   - Allows clients to specify a comma-separated list of fields on `GET /users`.
   - The API dynamically filters out unrequested fields from the response payload.

3. **Bulk Create (`POST /users/bulk`)**:
   - Accepts an array of user objects in the request body (or `{ users: [...] }`).
   - Validates each user individually.
   - Tracks and returns two detailed lists:
     - `added`: List of successfully created users.
     - `rejected`: List of rejected users accompanied by explicit reasons (e.g., duplicate email in database, duplicate email within incoming batch, missing required fields, or invalid email format).

4. **Bulk Delete (`DELETE /users`)**:
   - Accepts an array of user IDs in the request body (supports both `[1, 2, 3]` and `{ "ids": [1, 2, 3] }`).
   - Removes all matching users and returns a summary detailing which users were removed and any IDs that were not found.

5. **Interactive Testing Dashboard**:
   - Includes a built-in web interface (`http://localhost:3000`) with a dark-mode theme, live user table, interactive forms for single and bulk operations, and real-time HTTP response payload inspection.

6. **Automated Test Suite**:
   - Built-in test suite (`npm test`) covering 38 test assertions verifying all requirements and edge cases.

---

## 📁 Project Structure

```text
├── controllers/
│   └── userController.js      # Controller logic for all routes (validation, status codes)
├── models/
│   └── userModel.js           # In-memory user data store and business logic
├── routes/
│   └── userRoutes.js          # Express route definitions
├── public/
│   ├── index.html             # Interactive testing dashboard UI
│   ├── style.css              # Modern UI styling
│   └── app.js                 # Frontend API client logic
├── package.json               # Dependencies and scripts
├── server.js                  # Main Express app & server entry point
├── test.js                    # Automated test suite (38 assertions)
├── test-requests.http         # REST Client HTTP file for manual testing
└── README.md                  # Complete documentation
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
- Production / Normal mode:
  ```bash
  npm start
  ```
- Development mode (with auto-restart via nodemon):
  ```bash
  npm run dev
  ```
The server will start on **`http://localhost:3000`**.

### 3. Open Interactive Dashboard
Open your browser and navigate to:
```text
http://localhost:3000
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 📖 API Documentation & Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users` | Get all users (Supports `?fields=name,email`) |
| `GET` | `/users/:id` | Get single user by ID |
| `POST` | `/users` | Create single user |
| `PUT` | `/users/:id` | Update single user by ID |
| `DELETE` | `/users/:id` | Delete single user by ID |
| `POST` | `/users/bulk` | Bulk add users (returns added and rejected lists with reasons) |
| `DELETE` | `/users` | Bulk delete users by array of IDs in request body |
| `GET` | `/api` | API metadata & endpoint directory |

---

## 🔍 Detailed Endpoint Specifications

### 1. GET `/users` (with `?fields=` projection)
Returns all users. If `?fields=` is specified, only the selected fields are included for each record.

**Example Request:**
```http
GET /users?fields=name,email HTTP/1.1
Host: localhost:3000
```

**cURL:**
```bash
curl "http://localhost:3000/users?fields=name,email"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "fieldsApplied": ["name", "email"],
  "data": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    {
      "name": "Jane Smith",
      "email": "jane.smith@example.com"
    },
    {
      "name": "Alex Johnson",
      "email": "alex.j@example.com"
    }
  ]
}
```

---

### 2. POST `/users` (Single User Creation)
Creates a new user. Rejects missing fields or duplicate emails.

**Example Request:**
```http
POST /users HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Peter Parker",
  "email": "peter.parker@dailybugle.com",
  "role": "Photographer",
  "age": 21
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Peter Parker","email":"peter.parker@dailybugle.com","role":"Photographer","age":21}'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 4,
    "name": "Peter Parker",
    "email": "peter.parker@dailybugle.com",
    "role": "Photographer",
    "age": 21,
    "createdAt": "2026-10-30T10:00:00.000Z"
  }
}
```

**Duplicate Email Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Duplicate email: User with email 'peter.parker@dailybugle.com' already exists"
}
```

---

### 3. PUT `/users/:id` (Update User by ID)
Updates fields of an existing user. Ensures updated email does not conflict with another existing user.

**Example Request:**
```http
PUT /users/4 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Peter Parker (Spidey)",
  "role": "Superhero"
}
```

**cURL:**
```bash
curl -X PUT http://localhost:3000/users/4 \
  -H "Content-Type: application/json" \
  -d '{"name":"Peter Parker (Spidey)","role":"Superhero"}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 4,
    "name": "Peter Parker (Spidey)",
    "email": "peter.parker@dailybugle.com",
    "role": "Superhero",
    "age": 21,
    "createdAt": "2026-10-30T10:00:00.000Z",
    "updatedAt": "2026-10-30T10:05:00.000Z"
  }
}
```

---

### 4. DELETE `/users/:id` (Delete User by ID)
Deletes a single user by numeric ID. Returns 404 if the user is not found.

**Example Request:**
```http
DELETE /users/4 HTTP/1.1
Host: localhost:3000
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/users/4
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User with id 4 deleted successfully",
  "data": {
    "id": 4,
    "name": "Peter Parker (Spidey)",
    "email": "peter.parker@dailybugle.com"
  }
}
```

---

### 5. POST `/users/bulk` (Bulk Create Users)
Accepts an array of users and returns detailed lists showing which users were successfully added and which were rejected with specific reasons.

**Example Request:**
```http
POST /users/bulk HTTP/1.1
Host: localhost:3000
Content-Type: application/json

[
  { "name": "Bruce Wayne", "email": "batman@waynecorp.com", "role": "CEO", "age": 35 },
  { "name": "Clark Kent", "email": "john.doe@example.com" },
  { "name": "Diana Prince", "email": "wonder@themyscira.gov", "role": "Ambassador" },
  { "name": "Invalid Email User", "email": "not-an-email" },
  { "name": "Double Agent", "email": "batman@waynecorp.com" }
]
```

**cURL:**
```bash
curl -X POST http://localhost:3000/users/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"Bruce Wayne","email":"batman@waynecorp.com","role":"CEO"},
    {"name":"Clark Kent","email":"john.doe@example.com"},
    {"name":"Diana Prince","email":"wonder@themyscira.gov"},
    {"name":"Invalid Email User","email":"not-an-email"},
    {"name":"Double Agent","email":"batman@waynecorp.com"}
  ]'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk user creation processed",
  "summary": {
    "totalReceived": 5,
    "addedCount": 2,
    "rejectedCount": 3
  },
  "added": [
    {
      "id": 4,
      "name": "Bruce Wayne",
      "email": "batman@waynecorp.com",
      "role": "CEO",
      "age": 35,
      "createdAt": "2026-10-30T10:10:00.000Z"
    },
    {
      "id": 5,
      "name": "Diana Prince",
      "email": "wonder@themyscira.gov",
      "role": "Ambassador",
      "age": null,
      "createdAt": "2026-10-30T10:10:00.000Z"
    }
  ],
  "rejected": [
    {
      "itemIndex": 1,
      "user": {
        "name": "Clark Kent",
        "email": "john.doe@example.com"
      },
      "reason": "Duplicate email: 'john.doe@example.com' already exists in database"
    },
    {
      "itemIndex": 3,
      "user": {
        "name": "Invalid Email User",
        "email": "not-an-email"
      },
      "reason": "Invalid email format: 'not-an-email'"
    },
    {
      "itemIndex": 4,
      "user": {
        "name": "Double Agent",
        "email": "batman@waynecorp.com"
      },
      "reason": "Duplicate email: 'batman@waynecorp.com' duplicated within this bulk request batch"
    }
  ]
}
```

---

### 6. DELETE `/users` (Bulk Delete by Array of IDs)
Removes multiple users by providing an array of IDs in the request body. Supports both `[1, 2, 3]` and `{"ids": [1, 2, 3]}`.

**Example Request:**
```http
DELETE /users HTTP/1.1
Host: localhost:3000
Content-Type: application/json

[1, 2, 999]
```

**cURL:**
```bash
curl -X DELETE http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '[1, 2, 999]'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk delete processed. Deleted 2 user(s).",
  "summary": {
    "totalRequested": 3,
    "deletedCount": 2,
    "notFoundCount": 1
  },
  "deletedUsers": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "Admin",
      "age": 28
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "Developer",
      "age": 25
    }
  ],
  "notFoundIds": [999]
}
```

---

## 🧪 Test Suite Results

Running `npm test` executes the complete test suite verifying all 38 criteria:

```text
> node test.js

=================================================
🧪 STARTING USERS API TEST SUITE
=================================================

Test 1: GET /users (Retrieve all users)
  ✅ PASS: Status code is 200
  ✅ PASS: Response success is true
  ✅ PASS: Data is an array
  ✅ PASS: Initial count is 3

Test 2: GET /users?fields=name,email (Projection of selected fields)
  ✅ PASS: Status is 200
  ✅ PASS: Returns 3 users
  ✅ PASS: Contains 'name' and 'email'
  ✅ PASS: Does NOT contain 'role' or 'age'

Test 3: POST /users (Add single user)
  ✅ PASS: Status is 201 Created
  ✅ PASS: Created user name matches
  ✅ PASS: Created user email matches
  ✅ PASS: User has numeric ID

Test 4: POST /users with duplicate email
  ✅ PASS: Status is 409 Conflict for duplicate email
  ✅ PASS: Success is false

Test 5: GET /users/:id (Retrieve user by ID)
  ✅ PASS: Status is 200
  ✅ PASS: Fetched user id matches

Test 6: PUT /users/:id (Update user by ID)
  ✅ PASS: Status is 200
  ✅ PASS: Name updated successfully
  ✅ PASS: Role updated successfully

Test 7: DELETE /users/:id (Delete user by ID)
  ✅ PASS: Status is 200
  ✅ PASS: Deleted user returned
  ✅ PASS: Verify user now returns 404 Not Found

Test 8: POST /users/bulk (Bulk add with rejection reasons)
  ✅ PASS: Status is 200
  ✅ PASS: Total received is 6
  ✅ PASS: Added count is 2
  ✅ PASS: Rejected count is 4
  ✅ PASS: Added array has 2 users
  ✅ PASS: Rejected array has 4 items with reasons
  ✅ PASS: Contains 'already exists in database' reason
  ✅ PASS: Contains 'Invalid email format' reason
  ✅ PASS: Contains 'Missing name' reason
  ✅ PASS: Contains 'duplicated within batch' reason

Test 9: DELETE /users (Bulk delete by array of IDs)
  ✅ PASS: Status is 200
  ✅ PASS: Deleted count is 2
  ✅ PASS: Not found count is 1
  ✅ PASS: notFoundIds includes 999
  ✅ PASS: Status is 200 with { ids: [...] } object payload
  ✅ PASS: Deleted count is 1

=================================================
📊 TEST RESULTS: 38 PASSED, 0 FAILED
=================================================
```

---

## ⚖️ License
ISC
