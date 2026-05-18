-- I drop the tables first so I can reset the database easily while testing.
-- The order matters because some tables depend on other tables with foreign keys.
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS player_country;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS users;

-- This table stores basic user information.
-- For the first prototype, I only use one demo user.
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This table stores the starting country data.
-- These values are used to create the initial game state.
CREATE TABLE countries (
    country_id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) UNIQUE NOT NULL,
    population BIGINT NOT NULL CHECK (population >= 0),
    gdp NUMERIC(15,2) NOT NULL CHECK (gdp >= 0),
    gdp_per_capita NUMERIC(12,2) NOT NULL CHECK (gdp_per_capita >= 0),
    life_expectancy NUMERIC(5,2) CHECK (life_expectancy >= 0),
    literacy_rate NUMERIC(5,2) CHECK (literacy_rate BETWEEN 0 AND 100),
    unemployment_rate NUMERIC(5,2) CHECK (unemployment_rate BETWEEN 0 AND 100)
);

-- This table stores the current state of the player's selected country.
-- It changes when the player makes investments.
CREATE TABLE player_country (
    player_country_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    country_id INT NOT NULL REFERENCES countries(country_id) ON DELETE RESTRICT,
    budget NUMERIC(15,2) NOT NULL CHECK (budget >= 0),
    happiness NUMERIC(5,2) NOT NULL CHECK (happiness BETWEEN 0 AND 100),
    development_score NUMERIC(6,2) NOT NULL CHECK (development_score >= 0),
    turn_number INT NOT NULL DEFAULT 1 CHECK (turn_number >= 1),
    income_per_turn NUMERIC(15,2) NOT NULL CHECK (income_per_turn >= 0),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- In this simple prototype, one user can only have one active country.
    UNIQUE(user_id)
);

-- This table keeps the history of all investments made by the player.
-- It is useful for analytics and for showing past decisions later.
CREATE TABLE investments (
    investment_id SERIAL PRIMARY KEY,
    player_country_id INT NOT NULL REFERENCES player_country(player_country_id) ON DELETE CASCADE,

    -- I limit the sector names so the data stays consistent.
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

    investment_amount NUMERIC(15,2) NOT NULL CHECK (investment_amount > 0),
    development_effect NUMERIC(6,2) NOT NULL DEFAULT 0,
    happiness_effect NUMERIC(6,2) NOT NULL DEFAULT 0,
    turn_number INT NOT NULL CHECK (turn_number >= 1),
    investment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
