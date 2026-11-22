# Statropolis

> **Project status:** Educational prototype under technical review. Authentication, transaction guarantees, automated tests, and the planned AI advisor should not be considered production-ready.

Statropolis is a web-based strategic nation simulation platform where users manage a country, allocate investments across economic sectors, and compete through measurable development and performance indicators.

The prototype focuses on relational data integrity, SQL-backed gameplay, analytical queries, and modular architecture. It uses database-driven gameplay logic. A rule-based advisory module is planned but not yet implemented.

---

## 🚀 Core Features

- Prototype username-based player profiles (no password authentication)
- Single-country ownership per user (database-enforced constraint)
- Turn-based investment execution system
- Real-time budget and development score updates
- Historical investment tracking
- Competitive leaderboard ranking
- Sector-based analytical reporting

---

## 🏗 System Architecture

Statropolis follows a modular layered architecture:

- **Frontend:** React (Vite)
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL
- **Planned extension:** Rule-based investment advisor
- **Communication:** RESTful API

### Architectural Principles

- Separation of concerns
- Database-first modeling
- Database constraints and validation
- Layered abstraction
- Modular prototype architecture

Each layer operates independently and communicates through clearly defined interfaces.

---

## 🗄 Database Design

### Core Entities

- `Users`
- `Countries`
- `PlayerCountries`
- `Investments`

### Integrity Constraints

- One country per user (`UNIQUE user_id`)
- Budget cannot go below zero (`CHECK budget >= 0`)
- Strict foreign key relationships
- Primary-key and uniqueness constraints
- Investment transaction behavior (integration testing pending)

### Intended Investment Transaction Flow

1. Validate sufficient budget
2. Insert investment record
3. Update development metrics
4. Increment turn counter
5. Commit transaction (or rollback on failure)

This is the intended transaction flow. Atomicity and rollback behavior have not yet been verified through integration tests.

---

## 🤖 AI Investment Advisor

**Status: Planned.**

The repository includes a placeholder for a future
rule-based investment advisor. It does not currently
implement a trained ML model or a working recommendation
engine.


---

## 📊 Analytics & Leaderboard

Statropolis performs analytical computations directly at the database layer using optimized SQL queries:

- Sector capital distribution (`GROUP BY`)
- Development ranking (`ORDER BY`)
- Investment history tracking (`JOIN`)
- Trend-based performance evaluation

These queries support reporting and analytics. Query performance has not been benchmarked.

---

## 🔐 Validation & Error Handling

The system enforces:

- Budget underflow prevention
- Duplicate country selection restriction
- Referential integrity across all entities
- Input validation at the application layer
- API error handling (test coverage under review)

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Berkayaydinn/statropolis.git
cd statropolis
```
