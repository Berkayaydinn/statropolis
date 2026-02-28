# Statropolis – 4 Week Development Plan

## Team Members
- Elif Kanık
- Berkay Aydın

This development plan outlines the structured 4-week implementation process of the Statropolis project. Responsibilities are divided equally to ensure balanced workload and clear ownership of database tables, backend logic, frontend features, and documentation.

---

# 🗓 Week 1 — Database Design & Core Structure

## 🎯 Objective:
Design and finalize relational schema with constraints and proper normalization.

---

## 👩‍💻 Elif – Responsibilities

### Database (Main Tables)
- Implement `countries` table
- Implement `users` table
- Add:
  - PRIMARY KEY
  - NOT NULL constraints
  - UNIQUE(email)

### Documentation
- Draft ERD diagram
- Update `docs/ARCHITECTURE.md` (database section)

### Files to Complete
- `db/schema.sql`
- `docs/ARCHITECTURE.md`
- `docs/ERD.png`

---

## 👨‍💻 Berkay – Responsibilities

### Database (Main Tables)
- Implement `player_countries` table
- Implement `investments` table
- Add:
  - FOREIGN KEY constraints
  - CHECK (budget >= 0)
  - UNIQUE (user_id in player_countries)

### Backend Structure
- Finalize backend skeleton in:
  - `backend/app/main.py`
  - `backend/app/db/connection.py`

### Files to Complete
- `db/schema.sql`
- `backend/app/main.py`
- `backend/app/db/connection.py`

---

# 🗓 Week 2 — Core System Functionality (Game Loop)

## 🎯 Objective:
User registration → country selection → investment execution → database updates.

---

## 👩‍💻 Elif – Responsibilities

### Backend
- Implement:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /countries`
- Use raw SQL queries in `queries.py`
- Implement password hashing logic

### Frontend
- Create:
  - Login page
  - Register page
  - Country selection page

### Files to Complete
- `backend/app/routes/auth.py`
- `backend/app/routes/countries.py`
- `backend/app/db/queries.py`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/CountrySelect.jsx`

---

## 👨‍💻 Berkay – Responsibilities

### Backend
- Implement:
  - `POST /game/select-country`
  - `POST /game/invest`
- Add transaction handling (BEGIN / COMMIT / ROLLBACK)
- Enforce budget validation

### Frontend
- Create:
  - Dashboard page
  - Investment form component

### Files to Complete
- `backend/app/routes/game.py`
- `backend/app/db/queries.py`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/InvestmentForm.jsx`

---

# 🗓 Week 3 — Analytics & Advanced Queries

## 🎯 Objective:
Implement JOIN, GROUP BY, and ORDER BY queries with analytical endpoints.

---

## 👩‍💻 Elif – Responsibilities

### SQL Queries
- Implement:
  - Sector investment totals (GROUP BY)
  - Average development score

### Backend
- Improve:
  - `/countries` endpoint
  - `/auth/me` endpoint

### Files to Complete
- `db/queries.sql`
- `backend/app/routes/countries.py`
- `backend/app/routes/auth.py`

---

## 👨‍💻 Berkay – Responsibilities

### Backend
- Implement:
  - `GET /analytics/leaderboard`
  - `GET /game/history`
- Write JOIN query between:
  - users
  - player_countries
  - investments

### Frontend
- Create:
  - Leaderboard page
  - Investment history page

### Files to Complete
- `backend/app/routes/analytics.py`
- `db/queries.sql`
- `frontend/src/pages/Leaderboard.jsx`
- `frontend/src/pages/History.jsx`

---

# 🗓 Week 4 — Testing, Validation & Documentation

## 🎯 Objective:
Prepare submission-ready version of the project.

---

## 👩‍💻 Elif – Responsibilities

### Testing
- Write at least 10 test scenarios in `docs/TESTS.md`
- Validate:
  - UNIQUE constraints
  - FOREIGN KEY integrity
  - CHECK constraints

### Documentation
- Finalize ERD
- Update database explanation in `docs/REPORT.md`

---

## 👨‍💻 Berkay – Responsibilities

### Documentation
- Complete `docs/API.md`
- Add endpoint request/response examples

### Final Validation
- Verify:
  - No ORM usage
  - All SQL written manually
  - 4 main tables implemented
  - At least 2 foreign keys
  - 10+ functional requirements covered

---

# ✅ Final Deliverable Checklist

- 4 Main Tables implemented
- At least 2 Foreign Keys
- CHECK and UNIQUE constraints enforced
- JOIN query implemented
- GROUP BY query implemented
- ORDER BY query implemented
- No ORM usage
- ERD diagram included
- API documentation completed
- Test plan documented

---

# 🚀 Development Philosophy

The project follows a database-first approach with clear separation between:

- Data Layer (PostgreSQL)
- Application Layer (FastAPI backend)
- Presentation Layer (React frontend)
- Analytical Layer (SQL queries + AI module)

Responsibilities are distributed equally to ensure collaborative development and balanced technical contribution.
