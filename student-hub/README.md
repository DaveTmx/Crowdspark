# UniHub — Automated Student Resource Hub

A full-stack platform for university students to share and access study materials, built with **Node.js**, **PostgreSQL**, and vanilla HTML/CSS/JS. Features a complete **Role-Based Access Control (RBAC)** system.

---

## Architecture

```
student-hub/
├── backend/                  ← Node.js + Express API
│   ├── config/
│   │   ├── db.js             ← PostgreSQL pool + schema init
│   │   └── seed.js           ← Demo data seeder
│   ├── controllers/
│   │   ├── authController.js       ← register, login, /me
│   │   ├── resourceController.js   ← full CRUD + download
│   │   └── userController.js       ← admin user management
│   ├── middleware/
│   │   └── rbac.js           ← ★ RBAC engine (all roles + permissions)
│   ├── routes/
│   │   ├── auth.js           ← /api/auth/*
│   │   ├── resources.js      ← /api/resources/*
│   │   └── users.js          ← /api/users/* (admin only)
│   ├── uploads/              ← File storage (auto-created)
│   ├── server.js             ← Express entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    └── public/
        ├── index.html        ← Single-page app shell
        ├── css/style.css     ← Full stylesheet
        └── js/
            ├── api.js        ← Fetch wrapper + Auth/Resources/Users clients
            └── app.js        ← UI logic, page routing, RBAC-aware rendering
```

---

## Role-Based Access Control (RBAC)

The RBAC system lives in `backend/middleware/rbac.js`. It is the **single source of truth** for all permissions.

### Permission Map

| Permission              | Viewer | Uploader | Admin |
|-------------------------|:------:|:--------:|:-----:|
| resource:browse         | ✓      | ✓        | ✓     |
| resource:download       | ✓      | ✓        | ✓     |
| resource:upload         | ✗      | ✓        | ✓     |
| resource:edit_own       | ✗      | ✓        | ✓     |
| resource:delete_own     | ✗      | ✓        | ✓     |
| resource:edit_any       | ✗      | ✗        | ✓     |
| resource:delete_any     | ✗      | ✗        | ✓     |
| user:manage             | ✗      | ✗        | ✓     |
| user:approve            | ✗      | ✗        | ✓     |
| user:assign_role        | ✗      | ✗        | ✓     |
| audit:read              | ✗      | ✗        | ✓     |

### Middleware chain example (resource deletion)

```
DELETE /api/resources/:id
  → authenticate()        — verifies JWT, re-fetches user from DB
  → loadResource()        — fetches the resource and puts it on req.resource
  → requireOwnerOrAdmin() — allows only the uploader of this resource OR any admin
  → controller.remove()   — executes the deletion
```

### Role escalation flow

```
New Registration → viewer (pending)
                       ↓  Admin approves
                   viewer (active)
                       ↓  Admin promotes
                   uploader (active)
                       ↓  Admin promotes
                   admin
```

All role changes are written to the **audit_log** table.

---

## Database Schema

```sql
users         — id, name, email, password (bcrypt), role (enum), status, timestamps
resources     — id, title, description, course, type (enum), file_path, uploader_id (FK), download_count, timestamps
download_logs — id, resource_id (FK), user_id (FK), downloaded_at
audit_log     — id, actor_id (FK), action, target_id, details (JSONB), created_at
```

---

## Quick Start

### 1. Set up PostgreSQL

```bash
createdb student_hub
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET
npm install
```

### 3. Seed demo data

```bash
npm run seed
```

This creates five demo accounts:

| Email                    | Password       | Role     | Status  |
|--------------------------|----------------|----------|---------|
| admin@unihub.ac.zm       | Admin@1234     | admin    | active  |
| chanda@unihub.ac.zm      | Uploader@123   | uploader | active  |
| bupe@unihub.ac.zm        | Uploader@123   | uploader | active  |
| mutale@unihub.ac.zm      | Viewer@1234    | viewer   | active  |
| namakau@unihub.ac.zm     | Viewer@1234    | viewer   | pending |

### 4. Start the API server

```bash
npm run dev        # uses nodemon for auto-restart
# or
npm start          # production
```

API runs at: **http://localhost:4000**

### 5. Open the frontend

Open `frontend/public/index.html` directly in a browser **or** use a simple dev server:

```bash
cd ../frontend/public
npx serve .        # serves at http://localhost:3000
```

---

## API Reference

### Auth

| Method | Endpoint             | Auth | Description                       |
|--------|----------------------|------|-----------------------------------|
| POST   | /api/auth/register   | No   | Create account (pending, viewer)  |
| POST   | /api/auth/login      | No   | Get JWT token                     |
| GET    | /api/auth/me         | Yes  | Get current user                  |

### Resources

| Method | Endpoint                      | Role Required        | Description           |
|--------|-------------------------------|----------------------|-----------------------|
| GET    | /api/resources                | Any                  | List / search         |
| GET    | /api/resources/:id            | Any                  | Get one               |
| POST   | /api/resources                | uploader, admin      | Upload new resource   |
| PUT    | /api/resources/:id            | Owner or admin       | Update resource       |
| DELETE | /api/resources/:id            | Owner or admin       | Delete resource       |
| GET    | /api/resources/:id/download   | Any                  | Download + log        |

### Users (Admin only)

| Method | Endpoint                   | Description                |
|--------|----------------------------|----------------------------|
| GET    | /api/users                 | List all users             |
| GET    | /api/users/:id             | Get one user               |
| PATCH  | /api/users/:id/role        | Change role                |
| PATCH  | /api/users/:id/status      | Approve / suspend          |
| DELETE | /api/users/:id             | Delete user                |
| GET    | /api/users/audit-log       | Read RBAC audit log        |

---

## Security Features

- **Passwords**: bcrypt hashed (10 rounds)
- **JWT**: signed, expiry enforced, user re-fetched from DB on every request (role changes take effect immediately)
- **Rate limiting**: 200 req/15 min globally; 20 req/15 min on `/api/auth/`
- **File validation**: extension whitelist + multer size limit
- **CORS**: locked to specific origins in production
- **Audit log**: every role and status change is recorded with actor, target, and timestamp

---

## Extending the Project

Some ideas to take this further:

- **MySQL**: swap the `pg` package for `mysql2` and adjust SQL syntax (`$1` → `?`, `gen_random_uuid()` → `UUID()`)
- **React frontend**: replace the vanilla JS with a React SPA using the same API endpoints
- **Email notifications**: send approval emails via Nodemailer when an admin approves an account
- **Full-text search**: use PostgreSQL's `tsvector` for smarter resource search
- **AWS S3**: replace local `uploads/` folder with S3 for production file storage
- **Docker**: add a `docker-compose.yml` to containerise the API + database
