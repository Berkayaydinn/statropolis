# Statropolis

Statropolis is a web-based strategic nation simulation platform where users manage a country, allocate investments across economic sectors, and compete through measurable development and performance indicators.

The system is designed with a strong emphasis on transactional consistency, relational data integrity, analytical computation, and modular architecture. It integrates database-driven logic with an AI-powered strategic advisory module.

---

## 🚀 Core Features

- Secure user authentication (Register / Login)
- Single-country ownership per user (database-enforced constraint)
- Turn-based investment execution system
- Real-time budget and development score updates
- Historical investment tracking
- Competitive leaderboard ranking
- Sector-based analytical reporting
- AI-driven investment recommendation engine

---

## 🏗 System Architecture

Statropolis follows a modular layered architecture:

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **AI Engine:** Python-based advisory module
- **Communication:** RESTful API

### Architectural Principles

- Separation of concerns
- Database-first modeling
- Transactional safety
- Layered abstraction
- Scalable and extensible design

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
- Indexed columns for optimized query execution
- Transaction-controlled investment updates

### Transaction Flow (Investment Execution)

1. Validate sufficient budget
2. Insert investment record
3. Update development metrics
4. Increment turn counter
5. Commit transaction (or rollback on failure)

This ensures atomicity and prevents inconsistent system states.

---

## 🤖 AI Investment Advisor

The AI module analyzes:

- Current budget allocation
- Development score trends
- Historical investment patterns
- Sector growth behavior

It generates:

- Recommended investment sector
- Strategic reasoning explanation

The AI system is modular and designed for future integration with machine learning models.

---

## 📊 Analytics & Leaderboard

Statropolis performs analytical computations directly at the database layer using optimized SQL queries:

- Sector capital distribution (`GROUP BY`)
- Development ranking (`ORDER BY`)
- Investment history tracking (`JOIN`)
- Trend-based performance evaluation

This approach ensures scalability, correctness, and performance efficiency.

---

## 🔐 Validation & Error Handling

The system enforces:

- Budget underflow prevention
- Duplicate country selection restriction
- Referential integrity across all entities
- Input validation at the application layer
- Centralized error handling middleware

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/statropolis.git
cd statropolis
