-- This demo user lets me test the game without building a login system first.
INSERT INTO users (username, email, password_hash)
VALUES ('demo_user', 'demo@statropolis.com', 'demo_hash');

-- These countries are enough for the first working prototype.
-- The values create different starting situations for the player.
INSERT INTO countries
(country_name, population, gdp, gdp_per_capita, life_expectancy, literacy_rate, unemployment_rate)
VALUES
('Turkey', 85300000, 1100000000000, 12900, 76.0, 97.0, 9.4),
('Germany', 84000000, 4500000000000, 53500, 81.0, 99.0, 3.1),
('Brazil', 216000000, 2100000000000, 9700, 75.0, 94.0, 7.8),
('Japan', 124000000, 4200000000000, 33800, 84.5, 99.0, 2.6),
('South Africa', 60000000, 405000000000, 6750, 64.0, 95.0, 32.0);
