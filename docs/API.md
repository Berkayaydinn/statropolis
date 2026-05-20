# Statropolis API Specification

This document summarizes the main FastAPI endpoints used by the Statropolis prototype.

## Base URL

```text
http://127.0.0.1:8000
```

## Core Game Endpoints

### GET /

Checks if the backend is running.

Example response:

```json
{
  "message": "Statropolis API is running"
}
```

---

### GET /countries

Returns all playable countries loaded from the Kaggle country dataset.

Used by:

- Country selection map
- Game start screen

SQL concepts:

- SELECT
- ORDER BY

---

### GET /countries/{country_id}

Returns one country by its primary key.

SQL concepts:

- SELECT
- WHERE

---

### POST /start-game

Starts a new game session for the demo user.

Example request:

```json
{
  "country_id": 1
}
```

Database operations:

- READ selected country
- DELETE old active session for the demo user
- INSERT new player_country row
- RETURNING created row

SQL concepts:

- SELECT
- DELETE
- INSERT
- RETURNING
- FOREIGN KEY relationship between player_country and countries

---

### GET /game-state/{player_country_id}

Returns the current state of the selected country.

Used by:

- Game dashboard
- Budget/happiness/development display

SQL concepts:

- JOIN between player_country and countries
- WHERE filter

---

### POST /invest

Creates a new investment and updates the player country state.

Example request:

```json
{
  "player_country_id": 1,
  "sector_type": "Education",
  "investment_amount": 100000000
}
```

Database operations:

- READ current game state
- INSERT investment history row
- UPDATE player_country state

SQL concepts:

- SELECT
- INSERT
- UPDATE
- CHECK constraints on valid investment values

---

### POST /apply-event-state

Updates the current player country state after a campaign event.

Example request:

```json
{
  "player_country_id": 1,
  "budget": 1000000000,
  "happiness": 80,
  "development_score": 120
}
```

Database operations:

- UPDATE player_country
- RETURNING updated row id
- READ updated game state through the same game-state query

This endpoint is separate from `/invest` because crisis and opportunity events are not normal investment actions.

SQL concepts:

- UPDATE
- WHERE
- RETURNING

---

### GET /investments/{player_country_id}

Returns investment history for one game session.

SQL concepts:

- SELECT
- WHERE
- ORDER BY

---

## Analytics / Complex Query Endpoints

### GET /analytics/leaderboard

Ranks active player countries by development score.

SQL concepts:

- JOIN across users, player_country, and countries
- Window function: RANK()
- ORDER BY

---

### GET /analytics/sector-summary

Summarizes investment behavior by player, country, and sector.

SQL concepts:

- JOIN across investments, player_country, users, and countries
- GROUP BY
- COUNT()
- SUM()
- AVG()
- ORDER BY

---

### GET /analytics/neglected-sectors

Finds players who have not invested in Education.

SQL concepts:

- JOIN
- LEFT OUTER JOIN
- IS NULL anti-join pattern

---

### GET /analytics/country-stats

Shows which starting countries perform best on average.

SQL concepts:

- LEFT JOIN
- GROUP BY
- HAVING
- AVG()
- COUNT()
- MAX()

---

### GET /analytics/above-average

Finds player countries whose development score is above the global average.

SQL concepts:

- JOIN
- Nested scalar subquery
- Aggregate comparison
- ORDER BY
