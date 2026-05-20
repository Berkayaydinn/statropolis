-- ============================================================
-- Statropolis – SQL Query Reference
-- ============================================================
-- The main CRUD and analytics queries below are implemented by
-- the FastAPI backend. Some fixed values are written as examples
-- so the SQL can be read and tested manually.
--
-- I keep this file as a reference document for the SQL side of the project.
-- It helps us explain which database operations are used in the application
-- and where each query is triggered from the backend.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- CRUD OPERATIONS
-- ──────────────────────────────────────────────────────────────
-- CRUD means Create, Read, Update, and Delete.
-- These are the basic database operations required for a working application.
-- In our project, users, game sessions, countries, and investments are all
-- handled through these SQL operations.
-- ──────────────────────────────────────────────────────────────

-- CREATE — Insert a new user on registration
-- Example use: account creation / demo user setup
-- In the real backend, the username comes from the frontend.
-- Email and password_hash can be generated automatically in the prototype.
INSERT INTO users (username, email, password_hash)
VALUES ('demo_user', 'demo@statropolis.com', 'demo_hash');


-- CREATE — Start a new game session for a user
-- Endpoint: POST /start-game
-- This creates the active game state after a player selects a country.
-- The calculated budget, happiness, development_score, and income_per_turn
-- are stored in player_country, not in countries, because they are gameplay data.
INSERT INTO player_country
    (user_id, country_id, budget, happiness, development_score, income_per_turn)
VALUES (1, 2, 5350000000, 97.9, 143.5, 535000000)
RETURNING *;


-- CREATE — Record an investment action
-- Endpoint: POST /invest
-- Each investment is stored as a separate row.
-- This is better than storing investment1, investment2, etc. as repeated columns.
INSERT INTO investments
    (player_country_id, sector_type, investment_amount,
     development_effect, happiness_effect, turn_number)
VALUES (1, 'Education', 100000000, 4, 2, 1);


-- READ — Get all available countries
-- Endpoint: GET /countries
-- The frontend uses this query to display countries on the map and in the country list.
-- These values originally come from the CSV dataset, but the application reads them
-- from the PostgreSQL countries table during gameplay.
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
-- This is useful when we need the full data for one selected country.
SELECT *
FROM countries
WHERE country_id = 1;


-- READ — Get active game state with country name
-- Endpoint: GET /game-state/{player_country_id}
-- player_country stores the dynamic game values, while countries stores the country name.
-- I use JOIN here so the frontend can show readable country information instead of only IDs.
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
-- This reads the history of player decisions for one active campaign.
-- The ORDER BY keeps the history in turn order.
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
-- After an investment is inserted into investments, the current player_country
-- row is updated with the new budget, happiness, development score, and turn.
UPDATE player_country
SET
    budget = 1200000000,
    happiness = 88,
    development_score = 110,
    turn_number = 2
WHERE player_country_id = 1;


-- UPDATE — Apply a random campaign event result
-- Endpoint: POST /apply-event-state
-- Random events are not normal investments, but they still change the active game state.
-- RETURNING lets the backend confirm that a matching game row was updated.
UPDATE player_country
SET
    budget = 1000000000,
    happiness = 80,
    development_score = 120
WHERE player_country_id = 1
RETURNING player_country_id;


-- DELETE — Reset old active session for the demo user
-- Endpoint: POST /start-game
-- Since one user can only have one active campaign in this prototype,
-- the backend deletes the old game before inserting a new one.
DELETE FROM player_country
WHERE user_id = 1;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 1
-- JOIN · Window Function · ORDER BY
-- ──────────────────────────────────────────────────────────────
-- Purpose : Leaderboard ranking by development score.
-- Endpoint: GET /analytics/leaderboard
-- Criteria: JOIN across 3 tables and RANK() window function.
--
-- I do not store the leaderboard as a separate table because it is derived data.
-- It can always be calculated from player_country, users, and countries.
-- This avoids duplicated ranking data and keeps the leaderboard up to date.
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
--
-- This query turns raw investment rows into a useful analytics summary.
-- GROUP BY creates one summary row per username, country, and sector.
-- COUNT tells how many investments were made, SUM gives total spending,
-- and AVG shows the average development/happiness effects.
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
--
-- This query is useful because it finds missing behavior, not existing behavior.
-- LEFT JOIN keeps all active players first. Then IS NULL selects only the players
-- who do not have a matching Education investment row.
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
--
-- This query groups game sessions by country and calculates performance statistics.
-- HAVING is used instead of WHERE because we filter after COUNT is calculated.
-- This lets us show only countries that have at least one active player session.
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
--
-- The subquery calculates the average development score from all active games.
-- The outer query then returns only players above that average and calculates
-- how many points each player is above the average.
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
