-- I drop the tables first so I can reset the database easily while testing.
-- The order matters because some tables depend on other tables with foreign keys.
-- investments depends on player_country, player_country depends on users and countries.
-- That is why I drop the child tables before the parent tables.
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS player_country;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS users;

-- This table stores basic user information.
-- In the current prototype, the player only enters a username.
-- The backend automatically creates placeholder email and password_hash values.
-- I still keep email and password_hash here because this makes the users table
-- more realistic and easier to extend into a real login system later.
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This table stores the starting country data.
-- These values come from the cleaned CSV dataset.
-- I keep country data in its own table because many players can select
-- the same country, and I do not want to repeat GDP, population, or
-- life expectancy inside every player record.
-- These values are also used to create the initial game state.
CREATE TABLE countries (
    country_id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) UNIQUE NOT NULL,
    population BIGINT NOT NULL CHECK (population >= 0),
    gdp NUMERIC(20,2) NOT NULL CHECK (gdp >= 0),
    gdp_per_capita NUMERIC(12,2) NOT NULL CHECK (gdp_per_capita >= 0),
    life_expectancy NUMERIC(5,2) CHECK (life_expectancy >= 0),
    literacy_rate NUMERIC(5,2) CHECK (literacy_rate BETWEEN 0 AND 100),
    unemployment_rate NUMERIC(5,2) CHECK (unemployment_rate BETWEEN 0 AND 100)
);

-- This table stores the current state of the player's selected country.
-- It connects a user with a country and stores the changing game values.
-- I keep this separate from countries because countries contains fixed reference data,
-- while player_country contains dynamic gameplay data such as budget and score.
-- It changes when the player makes investments.
CREATE TABLE player_country (
    player_country_id SERIAL PRIMARY KEY,

    -- This foreign key connects the active game state to a valid user.
    -- ON DELETE CASCADE means if a user is deleted, their active game state
    -- is deleted automatically too.
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- This foreign key connects the active game state to a valid country.
    -- ON DELETE RESTRICT prevents deleting a country that is still being used
    -- by an active game record.
    country_id INT NOT NULL REFERENCES countries(country_id) ON DELETE RESTRICT,

    -- These CHECK constraints protect the game data from invalid values.
    -- For example, budget cannot be negative and happiness must stay between 0 and 100.
    budget NUMERIC(15,2) NOT NULL CHECK (budget >= 0),
    happiness NUMERIC(5,2) NOT NULL CHECK (happiness BETWEEN 0 AND 100),
    development_score NUMERIC(6,2) NOT NULL CHECK (development_score >= 0),
    turn_number INT NOT NULL DEFAULT 1 CHECK (turn_number >= 1),
    income_per_turn NUMERIC(15,2) NOT NULL CHECK (income_per_turn >= 0),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- In this simple prototype, one user can only have one active country.
    -- This keeps the game flow simple and avoids multiple active campaigns
    -- for the same username.
    UNIQUE(user_id)
);

-- This table keeps the history of all investments made by the player.
-- I keep investments in a separate table because one active game can have
-- many investments over time.
-- This design is better than creating columns like investment1, investment2, etc.
-- It also makes analytics easier because we can use GROUP BY on sector_type.
-- It is useful for analytics and for showing past decisions later.
CREATE TABLE investments (
    investment_id SERIAL PRIMARY KEY,

    -- Each investment belongs to exactly one active game state.
    -- ON DELETE CASCADE means if the related player_country row is deleted,
    -- its investment history is deleted too.
    player_country_id INT NOT NULL REFERENCES player_country(player_country_id) ON DELETE CASCADE,

    -- I limit the sector names so the data stays consistent.
    -- This prevents invalid sector names from being inserted into the database.
    -- It also helps the analytics queries group investment data correctly.
    sector_type VARCHAR(30) NOT NULL CHECK (
        sector_type IN (
            'Education',
            'Healthcare',
            'Industry',
            'Infrastructure',
            'Military',
            'Environment'
        )
    ),

    -- Investment amount must be positive because zero or negative investments
    -- would not make sense in the game logic.
    investment_amount NUMERIC(15,2) NOT NULL CHECK (investment_amount > 0),

    -- These effect columns store how much the investment changed the game values.
    -- Keeping them in the history table lets us analyze average sector effects later.
    development_effect NUMERIC(6,2) NOT NULL DEFAULT 0,
    happiness_effect NUMERIC(6,2) NOT NULL DEFAULT 0,

    -- turn_number shows when the investment happened in the campaign.
    turn_number INT NOT NULL CHECK (turn_number >= 1),

    -- PostgreSQL automatically stores the time of the investment if no value is provided.
    investment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
