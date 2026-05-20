import csv
from pathlib import Path

from database import execute_query


# I calculate the project base directory from this file location.
# This way the script can find the data folder even if I run the script
# from a different terminal location.
BASE_DIR = Path(__file__).resolve().parent.parent

# This is the CSV file that contains the raw country dataset.
# The seed script reads this file once and loads clean country data into PostgreSQL.
CSV_PATH = BASE_DIR / "data" / "country_data.csv"


def clean_number(value, default=0):
    # CSV files often store numbers as text.
    # This helper safely converts a raw CSV value into a float number.
    #
    # If the value is missing or cannot be converted, I return a default value
    # so the import process does not crash.
    if value is None:
        return default

    # I remove extra spaces around the value before trying to convert it.
    value = str(value).strip()

    # Empty cells in the CSV are replaced with the default value.
    if value == "":
        return default

    try:
        return float(value)
    except ValueError:
        # If the CSV contains an unexpected non-numeric value, I use the default.
        # This keeps the seeding process stable.
        return default


def calculate_life_expectancy(row):
    # The dataset stores male and female life expectancy separately.
    # Our game needs one general life expectancy value per country,
    # so I calculate the average of the two.
    male = clean_number(row.get("life_expectancy_male"), 70)
    female = clean_number(row.get("life_expectancy_female"), 74)
    return round((male + female) / 2, 2)


def calculate_literacy_proxy(row):
    # The dataset does not directly give the exact literacy_rate field we use.
    # I use primary school enrollment as a simple proxy for education level.
    female = clean_number(row.get("primary_school_enrollment_female"), 90)
    male = clean_number(row.get("primary_school_enrollment_male"), 90)

    # I average male and female enrollment values to get one education indicator.
    average = (female + male) / 2

    # Since this value works like a percentage, I keep it between 0 and 100.
    return round(min(100, max(0, average)), 2)


def read_csv_rows():
    # If the CSV file is missing, I stop safely instead of crashing.
    if not CSV_PATH.exists():
        print(f"CSV file not found: {CSV_PATH}")
        return []

    # I try both tab-separated and comma-separated reading because CSV exports
    # can look different depending on how GitHub/Kaggle saved the file.
    # This makes the script more flexible for different CSV formats.
    for delimiter in ["\t", ",", ";"]:
        with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file, delimiter=delimiter)
            rows = list(reader)

            # I use the "name" column as a quick check that the CSV was read correctly.
            # If "name" appears in the fieldnames, the delimiter is probably correct.
            if reader.fieldnames and "name" in reader.fieldnames:
                print(f"CSV delimiter detected: {repr(delimiter)}")
                print(f"CSV columns detected: {reader.fieldnames[:8]} ...")
                return rows

    print("Could not detect CSV columns correctly.")
    return []


def seed_from_csv():
    # This function is the main import process.
    # It reads the CSV, cleans the values, transforms them, and inserts countries
    # into the countries table.
    rows = read_csv_rows()

    valid_rows = []

    for row in rows:
        # Every country row must have a country name.
        # If the name is empty, that row is not useful for our application.
        country_name = row.get("name", "").strip()

        if country_name == "":
            continue

        valid_rows.append(row)

    # I do not clear the countries table if the CSV could not be read correctly.
    # This prevents accidentally deleting existing country data because of a bad file.
    if len(valid_rows) == 0:
        print("No valid country rows found. I did not clear the countries table.")
        return

    # I clear dependent tables first because countries are linked to active games.
    # investments depends on player_country, and player_country depends on countries.
    # So I delete them in this order to avoid foreign key constraint problems.
    execute_query("DELETE FROM investments;")
    execute_query("DELETE FROM player_country;")
    execute_query("DELETE FROM countries;")

    # This query inserts the cleaned country data into the countries table.
    # ON CONFLICT is included so if a country name already exists, the row can be updated
    # instead of creating duplicate country records.
    insert_query = """
        INSERT INTO countries
        (
            country_name,
            population,
            gdp,
            gdp_per_capita,
            life_expectancy,
            literacy_rate,
            unemployment_rate
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (country_name) DO UPDATE SET
            population = EXCLUDED.population,
            gdp = EXCLUDED.gdp,
            gdp_per_capita = EXCLUDED.gdp_per_capita,
            life_expectancy = EXCLUDED.life_expectancy,
            literacy_rate = EXCLUDED.literacy_rate,
            unemployment_rate = EXCLUDED.unemployment_rate;
    """

    inserted_count = 0

    # I use this set to avoid inserting the same country twice if the CSV has duplicates.
    seen_countries = set()

    for row in valid_rows:
        country_name = row.get("name", "").strip()

        # Some datasets may contain duplicate country rows.
        # I skip duplicates so the final list stays clean.
        if country_name in seen_countries:
            continue

        seen_countries.add(country_name)

        # The dataset stores population in thousands.
        # I multiply by 1000 so the database stores the approximate full population.
        population = int(clean_number(row.get("population"), 0) * 1000)

        # The dataset stores GDP in millions of USD.
        # I multiply by 1,000,000 so the database stores a full GDP value.
        gdp = clean_number(row.get("gdp"), 0) * 1_000_000

        # GDP per capita is used later for starting budget and development score.
        gdp_per_capita = clean_number(row.get("gdp_per_capita"), 1000)

        # Life expectancy is calculated from male and female life expectancy columns.
        life_expectancy = calculate_life_expectancy(row)

        # Literacy rate is estimated from school enrollment values.
        # I use this as the education-level indicator in the game.
        literacy_rate = calculate_literacy_proxy(row)

        # Unemployment affects happiness in the game, so I store it as a percentage value.
        unemployment_rate = clean_number(row.get("unemployment"), 8)

        # This inserts one cleaned country row into the countries table.
        execute_query(
            insert_query,
            (
                country_name,
                population,
                gdp,
                gdp_per_capita,
                life_expectancy,
                literacy_rate,
                unemployment_rate
            )
        )

        inserted_count += 1

    # This message helps us confirm that the seed process actually loaded data.
    print(f"Loaded {inserted_count} countries from country_data.csv.")


if __name__ == "__main__":
    # Running this file directly seeds the database from the CSV.
    # Example:
    # python seed_from_csv.py
    seed_from_csv()
