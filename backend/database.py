import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# I load the database settings from the .env file.
# This keeps local database information out of the main code.
load_dotenv()


def get_connection():
    # This function opens a new PostgreSQL connection.
    # I keep this logic in one place so the other backend files stay cleaner.
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
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows


def fetch_one(query, params=None):
    # I use this helper when I only expect one row from the database.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    row = cur.fetchone()

    cur.close()
    conn.close()

    return row


def execute_query(query, params=None):
    # I use this helper for INSERT, UPDATE, and DELETE queries.
    # These queries change the database, so I commit the transaction.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    conn.commit()

    cur.close()
    conn.close()


def insert_and_return(query, params=None):
    # I use this helper when I insert something and need the new row back.
    # This is useful for starting a new game and returning the created game state.
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(query, params or ())
    row = cur.fetchone()
    conn.commit()

    cur.close()
    conn.close()

    return row
