import csv
from pathlib import Path

from database import execute_query


BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "country_data.csv"


def clean_number(value, default=0):
    if value is None:
        return default

    value = str(value).strip()

    if value == "":
        return default

    try:
        return float(value)
    except ValueError:
        return default


def calculate_life_expectancy(row):
    male = clean_number(row.get("life_expectancy_male"), 70)
    female = clean_number(row.get("life_expectancy_female"), 74)
    return round((male + female) / 2, 2)


def calculate_literacy_proxy(row):
    female = clean_number(row.get("primary_school_enrollment_female"), 90)
    male = clean_number(row.get("primary_school_enrollment_male"), 90)

    average = (female + male) / 2
    return round(min(100, max(0, average)), 2)


def read_csv_rows():
    if not CSV_PATH.exists():
        print(f"CSV file not found: {CSV_PATH}")
        return []

    # I try both tab-separated and comma-separated reading because CSV exports
    # can look different depending on how GitHub/Kaggle saved the file.
    for delimiter in ["\t", ",", ";"]:
        with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file, delimiter=delimiter)
            rows = list(reader)

            if reader.fieldnames and "name" in reader.fieldnames:
                print(f"CSV delimiter detected: {repr(delimiter)}")
                print(f"CSV columns detected: {reader.fieldnames[:8]} ...")
                return rows

    print("Could not detect CSV columns correctly.")
    return []


def seed_from_csv():
    rows = read_csv_rows()

    valid_rows = []

    for row in rows:
        country_name = row.get("name", "").strip()

        if country_name == "":
            continue

        valid_rows.append(row)

    if len(valid_rows) == 0:
        print("No valid country rows found. I did not clear the countries table.")
        return

    # I clear dependent tables first because countries are linked to active games.
    execute_query("DELETE FROM investments;")
    execute_query("DELETE FROM player_country;")
    execute_query("DELETE FROM countries;")

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
    seen_countries = set()

    for row in valid_rows:
        country_name = row.get("name", "").strip()

        # Some datasets may contain duplicate country rows.
        # I skip duplicates so the final list stays clean.
        if country_name in seen_countries:
            continue

        seen_countries.add(country_name)

        # The dataset stores population in thousands.
        population = int(clean_number(row.get("population"), 0) * 1000)

        # The dataset stores GDP in millions of USD.
        gdp = clean_number(row.get("gdp"), 0) * 1_000_000

        gdp_per_capita = clean_number(row.get("gdp_per_capita"), 1000)
        life_expectancy = calculate_life_expectancy(row)
        literacy_rate = calculate_literacy_proxy(row)
        unemployment_rate = clean_number(row.get("unemployment"), 8)

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

    print(f"Loaded {inserted_count} countries from country_data.csv.")


if __name__ == "__main__":
    seed_from_csv()
