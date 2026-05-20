-- ============================================================
-- Statropolis – SQL Query Reference
-- ISE 305 · Spring 2026
-- Authors: Berkay Aydın · Elif Kanık
-- ============================================================
-- All queries below are executed by the FastAPI backend.
-- Each one is documented with its purpose and where it fires.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- CRUD OPERATIONS
-- ──────────────────────────────────────────────────────────────

-- CREATE — Insert a new user on registration
-- Endpoint: POST /auth/register
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

-- READ — Get all available countries (country selection map)
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

-- READ — Get active game state with country name (JOIN)
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

-- READ — Get investment history for a player
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

-- UPDATE — Apply investment effects to player state
-- Endpoint: POST /invest (runs after INSERT into investments)
UPDATE player_country
SET
    budget           = 5685000000,
    happiness        = 99.9,
    development_score = 147.5,
    turn_number      = 2
WHERE player_country_id = 1;

-- DELETE — Reset a game session when player starts over
-- Endpoint: POST /start-game (clears old session before creating new one)
DELETE FROM player_country
WHERE user_id = 1;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 1
-- 3-Table JOIN · ORDER BY
-- ──────────────────────────────────────────────────────────────
-- Purpose : Global leaderboard ranked by development score.
-- Endpoint: GET /analytics/leaderboard
-- UI      : Leaderboard page — shows all players ranked with
--           their country name and current simulation stats.
-- Criteria: JOIN across 3 tables (player_country → users → countries)
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
JOIN users     u ON pc.user_id    = u.user_id
JOIN countries c ON pc.country_id = c.country_id
ORDER BY pc.development_score DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 2
-- 3-Table JOIN · GROUP BY · Aggregate Functions
-- ──────────────────────────────────────────────────────────────
-- Purpose : Per-sector investment breakdown with player context.
--           Shows how much each player spent per sector and what
--           the average effects were.
-- Endpoint: GET /analytics/sector-summary
-- UI      : Analytics dashboard — sector spending bar chart.
-- Criteria: JOIN across 3 tables, GROUP BY with COUNT/SUM/AVG
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    i.sector_type,
    COUNT(i.investment_id)       AS total_investments,
    SUM(i.investment_amount)     AS total_spent,
    AVG(i.development_effect)    AS avg_dev_effect,
    AVG(i.happiness_effect)      AS avg_hap_effect
FROM investments i
JOIN player_country pc ON i.player_country_id = pc.player_country_id
JOIN users         u  ON pc.user_id           = u.user_id
JOIN countries     c  ON pc.country_id        = c.country_id
GROUP BY u.username, c.country_name, i.sector_type
ORDER BY total_spent DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 3
-- 3-Table JOIN · LEFT OUTER JOIN · IS NULL filter
-- ──────────────────────────────────────────────────────────────
-- Purpose : Find players who have never invested in Education.
--           Used to generate advisor recommendations.
-- Endpoint: GET /analytics/neglected-sectors
-- UI      : AI Advisor panel — triggers Education recommendation
--           when the player has ignored this sector entirely.
-- Criteria: LEFT JOIN to detect missing records (anti-join pattern)
-- ──────────────────────────────────────────────────────────────
SELECT
    u.username,
    c.country_name,
    pc.development_score,
    pc.turn_number
FROM player_country pc
JOIN users     u ON pc.user_id    = u.user_id
JOIN countries c ON pc.country_id = c.country_id
LEFT JOIN investments i
       ON i.player_country_id = pc.player_country_id
      AND i.sector_type = 'Education'
WHERE i.investment_id IS NULL
ORDER BY pc.development_score DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 4
-- LEFT OUTER JOIN · GROUP BY · HAVING · Aggregate Functions
-- ──────────────────────────────────────────────────────────────
-- Purpose : Rank countries by average player development score.
--           Shows which starting countries tend to perform best.
-- Endpoint: GET /analytics/country-stats
-- UI      : Country selection screen — shows historical
--           performance stats for each playable country.
-- Criteria: LEFT JOIN, GROUP BY with AVG/COUNT/MAX, HAVING clause
-- ──────────────────────────────────────────────────────────────
SELECT
    c.country_name,
    COUNT(pc.player_country_id)  AS total_players,
    AVG(pc.development_score)    AS avg_development,
    AVG(pc.happiness)            AS avg_happiness,
    MAX(pc.development_score)    AS highest_score
FROM countries c
LEFT JOIN player_country pc ON c.country_id = pc.country_id
GROUP BY c.country_id, c.country_name
HAVING COUNT(pc.player_country_id) > 0
ORDER BY avg_development DESC;


-- ──────────────────────────────────────────────────────────────
-- COMPLEX QUERY 5
-- 3-Table JOIN · Nested Subquery (scalar, used twice)
-- ──────────────────────────────────────────────────────────────
-- Purpose : Find players outperforming the global average.
--           Also calculates each player's margin above average.
-- Endpoint: GET /analytics/above-average
-- UI      : "Rising Nations" section on the leaderboard —
--           highlighted panel for above-average performers.
-- Criteria: Nested subquery in WHERE and SELECT, 3-table JOIN
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
JOIN users     u ON pc.user_id    = u.user_id
JOIN countries c ON pc.country_id = c.country_id
WHERE pc.development_score >
      (SELECT AVG(development_score) FROM player_country)
ORDER BY pc.development_score DESC;
