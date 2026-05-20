-- ============================================================
-- Statropolis – SQL Query Reference
-- ============================================================
-- The main CRUD and analytics queries below are implemented by
-- the FastAPI backend. Some fixed values are written as examples
-- so the SQL can be read and tested manually.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- CRUD OPERATIONS
-- ──────────────────────────────────────────────────────────────

-- CREATE — Insert a new user on registration
-- Example use: account creation / demo user setup
INSERT INTO users (username, email, password_hash)
VALUES ('demo_user', 'demo@statropolis.com', 'demo_hash');


-- CREATE — Start a new game session for a user
-- Endpoint: POST /start-game
INSERT INTO player_country
    (user_id, country_id, budget, happiness, development_score, income_per_turn)
VALUES (1, 2, 5350000000, 97.9, 143.5, 535000000)
RETURNING *;


-- CREATE — Record an investment action
-- Endpoint: POST /invest
INSERT INTO investments
    (player_country_id, sector_type, investment_amount,
     development_effect, happiness_effect, turn_number)
VALUES (1, 'Education', 100000000, 4, 2, 1);


-- READ — Get all available countries
-- Endpoint: GET /countries
SELECT
    country_id,
    country_name,
    population,
    gdp,
    gdp_per_capita,
    life_expectancy,
    literacy_rate,
    unemployment_rate
FROM countries
ORDER BY country_name;


-- READ — Get one country by ID
-- Endpoint: GET /countries/{country_id}
SELECT *
FROM countries
WHERE country_id = 1;


-- READ — Get active game state with country name
-- Endpoint: GET /game-state/{player_country_id}
SELECT
    pc.player_country_id,
    pc.user_id,
    pc.country_id,
    c.country_name,
    pc.budget,
    pc.happiness,
    pc.development_score,
    pc.turn_number,
    pc.income_per_turn,
    pc.started_at
FROM player_country pc
JOIN countries c ON pc.country_id = c.country_id
WHERE pc.player_country_id = 1;


-- READ — Get investment history for a game session
-- Endpoint: GET /investments/{player_country_id}
SELECT
    investment_id,
    sector_type,
    investment_amount,
    development_effect,
    happiness_effect,
    turn_number,
    investment_date
FROM investments
WHERE player_country_id = 1
ORDER BY turn_number;


-- UPDATE — Apply a normal investment result
-- Endpoint: POST /invest
UPDATE player_country
SET
    budget = 1200000000,
    happiness = 88,
    development_score = 110,
    turn_number = 2
WHERE player_country_id = 1;


-- UPDATE — Apply a random campaign event result
-- Endpoint: POST /apply-event-state
UPDATE player_country
SET
    budget = 1000000000,
    happiness = 80,
    development_score = 120
WHERE player_country_id = 1
RETURNING player_country_id;


-- DELETE — Reset old active session for the demo user
-- Endpoint: POST /start-game
DELETE FROM player_country
WHERE user_id = 1;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 1
-- JOIN · Window Function · ORDER BY
-- ──────────────────────────────────────────────────────────────
-- Purpose : Leaderboard ranking by development score.
-- Endpoint: GET /analytics/leaderboard
-- Criteria: JOIN across 3 tables and RANK() window function.
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    pc.development_score,
    pc.happiness,
    pc.budget,
    pc.turn_number,
    RANK() OVER (ORDER BY pc.development_score DESC) AS rank
FROM player_country pc
JOIN users u     ON pc.user_id = u.user_id
JOIN countries c ON pc.country_id = c.country_id
ORDER BY pc.development_score DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 2
-- Multi-table JOIN · GROUP BY · Aggregate Functions
-- ──────────────────────────────────────────────────────────────
-- Purpose : Per-sector investment breakdown with player context.
-- Endpoint: GET /analytics/sector-summary
-- Criteria: JOIN across 4 tables, GROUP BY, COUNT/SUM/AVG.
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    i.sector_type,
    COUNT(i.investment_id) AS total_investments,
    SUM(i.investment_amount) AS total_spent,
    ROUND(AVG(i.development_effect), 2) AS avg_development_effect,
    ROUND(AVG(i.happiness_effect), 2) AS avg_happiness_effect
FROM investments i
JOIN player_country pc ON i.player_country_id = pc.player_country_id
JOIN users u           ON pc.user_id = u.user_id
JOIN countries c       ON pc.country_id = c.country_id
GROUP BY u.username, c.country_name, i.sector_type
ORDER BY total_spent DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 3
-- JOIN · LEFT OUTER JOIN · IS NULL Anti-Join
-- ──────────────────────────────────────────────────────────────
-- Purpose : Find players who have not invested in Education.
-- Endpoint: GET /analytics/neglected-sectors
-- Criteria: LEFT JOIN with NULL filtering.
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    pc.development_score,
    pc.turn_number
FROM player_country pc
JOIN users u     ON pc.user_id = u.user_id
JOIN countries c ON pc.country_id = c.country_id
LEFT JOIN investments i
       ON i.player_country_id = pc.player_country_id
      AND i.sector_type = 'Education'
WHERE i.investment_id IS NULL
ORDER BY pc.development_score DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 4
-- LEFT JOIN · GROUP BY · HAVING · Aggregate Functions
-- ──────────────────────────────────────────────────────────────
-- Purpose : Country performance summary from player sessions.
-- Endpoint: GET /analytics/country-stats
-- Criteria: LEFT JOIN, GROUP BY, HAVING, AVG/COUNT/MAX.
-- ──────────────────────────────────────────────────────────────
SELECT
    c.country_name,
    COUNT(pc.player_country_id) AS total_players,
    ROUND(AVG(pc.development_score), 2) AS avg_development,
    ROUND(AVG(pc.happiness), 2) AS avg_happiness,
    MAX(pc.development_score) AS highest_score
FROM countries c
LEFT JOIN player_country pc ON c.country_id = pc.country_id
GROUP BY c.country_id, c.country_name
HAVING COUNT(pc.player_country_id) > 0
ORDER BY avg_development DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 5
-- JOIN · Nested Scalar Subquery · Aggregate Comparison
-- ──────────────────────────────────────────────────────────────
-- Purpose : Find player countries above the global average score.
-- Endpoint: GET /analytics/above-average
-- Criteria: nested subquery used in SELECT and WHERE.
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    pc.development_score,
    pc.turn_number,
    ROUND(
        pc.development_score -
        (SELECT AVG(development_score) FROM player_country),
        2
    ) AS score_above_avg
FROM player_country pc
JOIN users u     ON pc.user_id = u.user_id
JOIN countries c ON pc.country_id = c.country_id
WHERE pc.development_score >
      (SELECT AVG(development_score) FROM player_country)
ORDER BY pc.development_score DESC;
