import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# I load the database settings from the .env file.
# This keeps local database information out of the main code.
# For example, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, and DB_PORT
# can be different on each computer, so I do not hard-code them here.
load_dotenv()


def get_connection():
    # This function opens a new PostgreSQL connection.
    # I keep this logic in one place so the other backend files stay cleaner.
    # Instead of writing psycopg2.connect(...) in every endpoint, the rest of
    # the project can just call this function through the helper functions below.
    #
    # RealDictCursor makes query results come back like dictionaries.
    # That is useful because FastAPI can return them as JSON more easily.
    # Example result:
    # {"country_id": 1, "country_name": "Canada"}
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", 5432),
        cursor_factory=RealDictCursor
    )


def fetch_all(query, params=None):
    # I use this helper for SELECT queries that return multiple rows.
    # For example, this is useful for getting all countries or all leaderboard rows.
    #
    # The params part is important because it lets us pass values safely
    # instead of directly putting user input inside the SQL string.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    rows = cur.fetchall()

    # I close both the cursor and the connection after the query.
    # This keeps the backend from leaving unnecessary database connections open.
    cur.close()
    conn.close()

    return rows


def fetch_one(query, params=None):
    # I use this helper when I only expect one row from the database.
    # For example, checking if a username already exists should return
    # either one user row or nothing.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    row = cur.fetchone()

    # I close the database resources after reading the single row.
    cur.close()
    conn.close()

    return row


def execute_query(query, params=None):
    # I use this helper for INSERT, UPDATE, and DELETE queries.
    # These queries change the database, so I commit the transaction.
    #
    # This helper does not return a row. I use it when I only need the
    # database operation to happen, such as deleting old game records
    # or inserting a history record.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    conn.commit()

    # After committing, I close the cursor and connection to keep things clean.
    cur.close()
    conn.close()


def insert_and_return(query, params=None):
    # I use this helper when I insert something and need the new row back.
    # This is useful for starting a new game and returning the created game state.
    #
    # The SQL query normally uses RETURNING for this.
    # Example:
    # INSERT INTO player_country (...) VALUES (...) RETURNING *;
    #
    # This helps the frontend immediately receive the new database row
    # without needing a second SELECT query.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    row = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return row
