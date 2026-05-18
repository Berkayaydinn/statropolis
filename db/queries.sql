-- Query 1: List all available countries.
-- I use this query to show the country selection list in the frontend.
SELECT
    country_id,
    country_name,
    population,
    gdp_per_capita,
    life_expectancy,
    literacy_rate,
    unemployment_rate
FROM countries
ORDER BY country_name;


-- Query 2: Show the current game state for a player.
-- This joins the player state with the selected country name.
SELECT
    pc.player_country_id,
    c.country_name,
    pc.budget,
    pc.happiness,
    pc.development_score,
    pc.turn_number,
    pc.income_per_turn
FROM player_country pc
JOIN countries c ON pc.country_id = c.country_id
WHERE pc.player_country_id = 1;


-- Query 3: Show all investments made by a player.
-- This helps track the player's decision history.
SELECT
    i.investment_id,
    c.country_name,
    i.sector_type,
    i.investment_amount,
    i.development_effect,
    i.happiness_effect,
    i.turn_number,
    i.investment_date
FROM investments i
JOIN player_country pc ON i.player_country_id = pc.player_country_id
JOIN countries c ON pc.country_id = c.country_id
WHERE pc.player_country_id = 1
ORDER BY i.turn_number;


-- Query 4: Total investment amount by sector.
-- This query uses GROUP BY to summarize where the player spent money.
SELECT
    sector_type,
    SUM(investment_amount) AS total_invested,
    COUNT(*) AS investment_count
FROM investments
GROUP BY sector_type
ORDER BY total_invested DESC;


-- Query 5: Countries ordered by development potential.
-- This gives a simple analytical view of country starting conditions.
SELECT
    country_name,
    gdp_per_capita,
    literacy_rate,
    life_expectancy,
    unemployment_rate,
    (gdp_per_capita / 1000 + literacy_rate / 2 + life_expectancy / 2) AS estimated_development_score
FROM countries
ORDER BY estimated_development_score DESC;


-- Query 6: Average investment effects by sector.
-- This can be used later to analyze which sectors were more useful.
SELECT
    sector_type,
    AVG(development_effect) AS avg_development_effect,
    AVG(happiness_effect) AS avg_happiness_effect
FROM investments
GROUP BY sector_type
ORDER BY avg_development_effect DESC;


-- Query 7: Player progress summary.
-- This query gives a compact summary of the current game progress.
SELECT
    c.country_name,
    pc.turn_number,
    pc.budget,
    pc.happiness,
    pc.development_score,
    COUNT(i.investment_id) AS total_investments
FROM player_country pc
JOIN countries c ON pc.country_id = c.country_id
LEFT JOIN investments i ON pc.player_country_id = i.player_country_id
GROUP BY
    c.country_name,
    pc.turn_number,
    pc.budget,
    pc.happiness,
    pc.development_score
ORDER BY pc.turn_number DESC;
