from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import fetch_all, fetch_one, execute_query, insert_and_return

# This creates the FastAPI application.
# The backend provides API routes for the React frontend.
app = FastAPI(title="Statropolis API")

# I allow the frontend to call this backend during local development.
# React usually runs on port 5173 and FastAPI runs on port 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartGameRequest(BaseModel):
    # The frontend sends the selected country and the player username.
    country_id: int
    username: str = "demo_player"


class InvestRequest(BaseModel):
    # The frontend sends these values when the player makes an investment.
    player_country_id: int
    sector_type: str
    investment_amount: float


class EventStateUpdateRequest(BaseModel):
    # Random events change the game state outside a normal investment.
    player_country_id: int
    budget: float
    happiness: float
    development_score: float


class UserRequest(BaseModel):
    username: str


class RenameUserRequest(BaseModel):
    username: str


def normalize_username(username: str) -> str:
    cleaned = username.strip()

    if len(cleaned) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters.")

    if len(cleaned) > 30:
        raise HTTPException(status_code=400, detail="Username must be 30 characters or shorter.")

    return cleaned


def get_or_create_user(username: str):
    # I keep the user system simple for the prototype.
    # Username is enough for the classroom demo; email/password are placeholder values
    # because the schema already contains these columns.
    clean_username = normalize_username(username)

    existing = fetch_one(
        "SELECT user_id, username, created_at FROM users WHERE username = %s;",
        (clean_username,)
    )

    if existing:
        return existing

    safe_email_name = clean_username.lower().replace(" ", "_")
    email = f"{safe_email_name}@statropolis.local"

    new_user = insert_and_return(
        """
        INSERT INTO users (username, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING user_id, username, created_at;
        """,
        (clean_username, email, "prototype-no-login-password")
    )

    return new_user


@app.get("/")
def home():
    # I use this simple route to quickly check if the backend is running.
    return {"message": "Statropolis API is running"}


# ──────────────────────────────────────────────────────────────
# USER CRUD ENDPOINTS
# These make the leaderboard feel real because different usernames
# can play from different browsers/computers and appear in the ranking.
# ──────────────────────────────────────────────────────────────

@app.post("/users")
def create_or_get_user(request: UserRequest):
    # CREATE if username does not exist, READ if it already exists.
    return get_or_create_user(request.username)


@app.get("/users")
def get_users():
    # READ all prototype users.
    query = """
        SELECT
            u.user_id,
            u.username,
            u.created_at,
            COUNT(pc.player_country_id) AS active_games
        FROM users u
        LEFT JOIN player_country pc ON u.user_id = pc.user_id
        GROUP BY u.user_id, u.username, u.created_at
        ORDER BY u.created_at DESC;
    """
    return fetch_all(query)


@app.put("/users/{user_id}")
def rename_user(user_id: int, request: RenameUserRequest):
    # UPDATE username.
    clean_username = normalize_username(request.username)

    updated = insert_and_return(
        """
        UPDATE users
        SET username = %s
        WHERE user_id = %s
        RETURNING user_id, username, created_at;
        """,
        (clean_username, user_id)
    )

    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return updated


@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    # DELETE user. Related player_country rows are removed by ON DELETE CASCADE.
    deleted = insert_and_return(
        """
        DELETE FROM users
        WHERE user_id = %s
        RETURNING user_id, username;
        """,
        (user_id,)
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted", "user": deleted}


@app.get("/countries")
def get_countries():
    # This route returns all countries for the country selection map.
    query = """
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
    """

    return fetch_all(query)


@app.get("/countries/{country_id}")
def get_country(country_id: int):
    # This route returns one country with all stored information.
    query = """
        SELECT *
        FROM countries
        WHERE country_id = %s;
    """

    country = fetch_one(query, (country_id,))

    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    return country


@app.post("/start-game")
def start_game(request: StartGameRequest):
    # First, I get or create the user who is playing this campaign.
    user = get_or_create_user(request.username)

    # Then I get the selected country from the database.
    country = fetch_one(
        "SELECT * FROM countries WHERE country_id = %s;",
        (request.country_id,)
    )

    if not country:
        raise HTTPException(status_code=404, detail="Country not found")

    # This is a simple prototype formula for starting budget.
    base_budget = float(country["gdp_per_capita"]) * 100000

    # Happiness is calculated with a simple game rule.
    happiness = min(
        100,
        max(
            0,
            float(country["life_expectancy"])
            - float(country["unemployment_rate"])
            + 20
        )
    )

    # Development score combines economy, literacy, and health indicators.
    development_score = (
        float(country["gdp_per_capita"]) / 1000
        + float(country["literacy_rate"]) / 2
        + float(country["life_expectancy"]) / 2
    )

    # Each turn gives the player income.
    income_per_turn = base_budget * 0.10

    # One user has one active country at a time.
    # Starting a new campaign resets only this user's old campaign.
    existing_game = fetch_one(
        "SELECT * FROM player_country WHERE user_id = %s;",
        (user["user_id"],)
    )

    if existing_game:
        execute_query("DELETE FROM player_country WHERE user_id = %s;", (user["user_id"],))

    insert_query = """
        INSERT INTO player_country
        (user_id, country_id, budget, happiness, development_score, income_per_turn)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *;
    """

    new_game = insert_and_return(
        insert_query,
        (
            user["user_id"],
            request.country_id,
            base_budget,
            happiness,
            development_score,
            income_per_turn
        )
    )

    return new_game


@app.get("/game-state/{player_country_id}")
def get_game_state(player_country_id: int):
    # This route returns the current game state with the country name and username.
    query = """
        SELECT
            pc.player_country_id,
            pc.user_id,
            u.username,
            pc.country_id,
            c.country_name,
            pc.budget,
            pc.happiness,
            pc.development_score,
            pc.turn_number,
            pc.income_per_turn,
            pc.started_at
        FROM player_country pc
        JOIN users u ON pc.user_id = u.user_id
        JOIN countries c ON pc.country_id = c.country_id
        WHERE pc.player_country_id = %s;
    """

    game_state = fetch_one(query, (player_country_id,))

    if not game_state:
        raise HTTPException(status_code=404, detail="Game state not found")

    return game_state


@app.get("/investments/{player_country_id}")
def get_investments(player_country_id: int):
    # This route returns the investment history of the current game.
    query = """
        SELECT
            investment_id,
            sector_type,
            investment_amount,
            development_effect,
            happiness_effect,
            turn_number,
            investment_date
        FROM investments
        WHERE player_country_id = %s
        ORDER BY turn_number;
    """

    return fetch_all(query, (player_country_id,))


@app.post("/invest")
def make_investment(request: InvestRequest):
    # I get the current game state before applying the investment.
    game = fetch_one(
        "SELECT * FROM player_country WHERE player_country_id = %s;",
        (request.player_country_id,)
    )

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if request.investment_amount <= 0:
        raise HTTPException(status_code=400, detail="Investment amount must be positive")

    # The player cannot spend more than the current budget.
    if float(game["budget"]) < request.investment_amount:
        raise HTTPException(status_code=400, detail="Not enough budget")

    sector_effects = {
        "Education": {"development": 4, "happiness": 2},
        "Healthcare": {"development": 2, "happiness": 5},
        "Industry": {"development": 6, "happiness": -1},
        "Infrastructure": {"development": 5, "happiness": 1},
        "Military": {"development": 2, "happiness": -2},
        "Environment": {"development": 3, "happiness": 4}
    }

    if request.sector_type not in sector_effects:
        raise HTTPException(status_code=400, detail="Invalid sector type")

    effect = sector_effects[request.sector_type]

    # The investment lowers the budget, then the next turn income is added.
    new_budget = (
        float(game["budget"])
        - request.investment_amount
        + float(game["income_per_turn"])
    )

    # Happiness should stay between 0 and 100.
    new_happiness = min(
        100,
        max(0, float(game["happiness"]) + effect["happiness"])
    )

    # Development score increases based on the selected sector.
    new_development = float(game["development_score"]) + effect["development"]

    # One investment represents moving to the next year.
    new_turn = int(game["turn_number"]) + 1

    # I save the investment history first.
    execute_query(
        """
        INSERT INTO investments
        (player_country_id, sector_type, investment_amount, development_effect, happiness_effect, turn_number)
        VALUES (%s, %s, %s, %s, %s, %s);
        """,
        (
            request.player_country_id,
            request.sector_type,
            request.investment_amount,
            effect["development"],
            effect["happiness"],
            game["turn_number"]
        )
    )

    # Then I update the current game state.
    execute_query(
        """
        UPDATE player_country
        SET
            budget = %s,
            happiness = %s,
            development_score = %s,
            turn_number = %s
        WHERE player_country_id = %s;
        """,
        (
            new_budget,
            new_happiness,
            new_development,
            new_turn,
            request.player_country_id
        )
    )

    # I return the updated game state to the frontend.
    return get_game_state(request.player_country_id)


@app.post("/apply-event-state")
def apply_event_state(request: EventStateUpdateRequest):
    # Event effects are not normal investments, but they still change the active country.
    # I store the new values in PostgreSQL so the next investment continues from the correct state.
    updated = insert_and_return(
        """
        UPDATE player_country
        SET
            budget = %s,
            happiness = %s,
            development_score = %s
        WHERE player_country_id = %s
        RETURNING player_country_id;
        """,
        (
            request.budget,
            request.happiness,
            request.development_score,
            request.player_country_id
        )
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Game state not found")

    return get_game_state(request.player_country_id)


@app.get("/analytics/sector-summary")
def sector_summary():
    # Complex Query: 4-table JOIN + GROUP BY + aggregate functions.
    query = """
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
        JOIN users u ON pc.user_id = u.user_id
        JOIN countries c ON pc.country_id = c.country_id
        GROUP BY u.username, c.country_name, i.sector_type
        ORDER BY total_spent DESC;
    """

    return fetch_all(query)


# ──────────────────────────────────────────────────────────────
# COMPLEX QUERY ENDPOINTS
# Added to satisfy advanced SQL requirements (ISE 305).
# These endpoints do not change existing game logic.
# ──────────────────────────────────────────────────────────────

@app.get("/analytics/leaderboard")
def leaderboard():
    # Complex Query 1: 3-table JOIN + RANK window function.
    # Returns all players ranked by development score.
    query = """
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
    """
    return fetch_all(query)


@app.delete("/analytics/leaderboard")
def clear_leaderboard():
    # DELETE operation for the demo leaderboard.
    # The leaderboard is generated from player_country, so clearing player_country
    # removes every ranking row. Investments are removed first because they depend
    # on player_country. The users table stays available for the user CRUD demo.
    execute_query("DELETE FROM investments;")
    execute_query("DELETE FROM player_country;")

    return {"message": "Leaderboard cleared"}


@app.get("/analytics/neglected-sectors")
def neglected_sectors():
    # Complex Query 3: 3-table JOIN + LEFT OUTER JOIN + IS NULL.
    # Finds players who have never invested in Education.
    query = """
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
    """
    return fetch_all(query)


@app.get("/analytics/country-stats")
def country_stats():
    # Complex Query 4: LEFT JOIN + GROUP BY + HAVING + AVG/COUNT/MAX.
    query = """
        SELECT
            c.country_name,
            COUNT(pc.player_country_id)  AS total_players,
            ROUND(AVG(pc.development_score), 2) AS avg_development,
            ROUND(AVG(pc.happiness), 2)          AS avg_happiness,
            MAX(pc.development_score)            AS highest_score
        FROM countries c
        LEFT JOIN player_country pc ON c.country_id = pc.country_id
        GROUP BY c.country_id, c.country_name
        HAVING COUNT(pc.player_country_id) > 0
        ORDER BY avg_development DESC;
    """
    return fetch_all(query)


@app.get("/analytics/above-average")
def above_average():
    # Complex Query 5: 3-table JOIN + nested subquery used twice.
    query = """
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
    """
    return fetch_all(query)
