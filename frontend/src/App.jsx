import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

const sectors = [
  {
    name: "Education",
    icon: "🎓",
    description: "Improves long-term development and slightly increases happiness.",
    amount: 100000000
  },
  {
    name: "Healthcare",
    icon: "🏥",
    description: "Strongly improves happiness and supports social development.",
    amount: 100000000
  },
  {
    name: "Industry",
    icon: "🏭",
    description: "Boosts development quickly but may slightly reduce happiness.",
    amount: 150000000
  },
  {
    name: "Infrastructure",
    icon: "🚆",
    description: "Improves development and supports future growth.",
    amount: 150000000
  },
  {
    name: "Military",
    icon: "🛡️",
    description: "Adds limited development but may reduce happiness.",
    amount: 120000000
  },
  {
    name: "Environment",
    icon: "🌱",
    description: "Improves happiness and supports balanced development.",
    amount: 100000000
  }
];

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [message, setMessage] = useState("Choose a country to start your first simulation.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    try {
      const response = await fetch(`${API_BASE}/countries`);
      const data = await response.json();

      setCountries(data);

      if (data.length > 0) {
        setSelectedCountryId(data[0].country_id);
      }
    } catch (error) {
      setMessage("Could not load countries. Please check if the backend is running.");
    }
  }

  async function startGame() {
    if (!selectedCountryId) {
      setMessage("Please select a country first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/start-game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          country_id: Number(selectedCountryId)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Could not start the game.");
        setLoading(false);
        return;
      }

      const fullStateResponse = await fetch(`${API_BASE}/game-state/${data.player_country_id}`);
      const fullState = await fullStateResponse.json();

      setGameState(fullState);
      setInvestments([]);
      setMessage(`Simulation started with ${fullState.country_name}.`);
    } catch (error) {
      setMessage("Backend connection failed. Make sure FastAPI is running on port 8000.");
    }

    setLoading(false);
  }

  async function makeInvestment(sector) {
    if (!gameState) {
      setMessage("Start a game before making an investment.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/invest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          player_country_id: gameState.player_country_id,
          sector_type: sector.name,
          investment_amount: sector.amount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Investment failed.");
        setLoading(false);
        return;
      }

      setGameState(data);
      setMessage(`${sector.name} investment completed successfully.`);

      const historyResponse = await fetch(`${API_BASE}/investments/${gameState.player_country_id}`);
      const historyData = await historyResponse.json();
      setInvestments(historyData);
    } catch (error) {
      setMessage("Could not send investment request to the backend.");
    }

    setLoading(false);
  }

  function formatMoney(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return `$${Number(value).toLocaleString()}`;
  }

  function formatNumber(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return Number(value).toFixed(1);
  }

  function getAdvisorText() {
    if (!gameState) {
      return "After you start a simulation, the advisor will suggest a useful investment direction.";
    }

    if (gameState.happiness < 70) {
      return "Happiness is relatively low. Healthcare, Education, or Environment would be safer choices.";
    }

    if (gameState.development_score < 100) {
      return "Development can still improve. Infrastructure or Industry may help the country grow faster.";
    }

    return "The country is stable. A balanced investment strategy would work well for the next turns.";
  }

  return (
    <div className="page">
      <div className="mapOverlay"></div>

      <header className="hero">
        <div>
          <p className="eyebrow">Data-driven country management game</p>
          <h1>Statropolis</h1>
          <p className="subtitle">
            Choose a country, manage its yearly budget, and improve development through strategic investments.
          </p>
        </div>
      </header>

      <main className="layout">
        <section className="panel setupPanel">
          <div className="panelHeader">
            <div>
              <h2>Start Simulation</h2>
              <p>Select a country and create the first playable game state.</p>
            </div>
          </div>

          <label className="fieldLabel">Country</label>
          <select
            value={selectedCountryId}
            onChange={(event) => setSelectedCountryId(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.country_id} value={country.country_id}>
                {country.country_name}
              </option>
            ))}
          </select>

          <button className="primaryButton" onClick={startGame} disabled={loading}>
            {loading ? "Processing..." : "Start Game"}
          </button>

          <div className="messageBox">{message}</div>
        </section>

        <section className="panel advisorPanel">
          <h2>AI Advisor</h2>
          <p>{getAdvisorText()}</p>
        </section>

        {gameState && (
          <>
            <section className="panel statsPanel">
              <div className="panelHeader">
                <div>
                  <h2>{gameState.country_name}</h2>
                  <p>Current simulation state</p>
                </div>
                <span className="turnBadge">Turn {gameState.turn_number}</span>
              </div>

              <div className="statsGrid">
                <div className="statCard">
                  <span>Budget</span>
                  <strong>{formatMoney(gameState.budget)}</strong>
                </div>

                <div className="statCard">
                  <span>Happiness</span>
                  <strong>{formatNumber(gameState.happiness)}</strong>
                </div>

                <div className="statCard">
                  <span>Development</span>
                  <strong>{formatNumber(gameState.development_score)}</strong>
                </div>

                <div className="statCard">
                  <span>Income / Turn</span>
                  <strong>{formatMoney(gameState.income_per_turn)}</strong>
                </div>
              </div>
            </section>

            <section className="panel investmentPanel">
              <div className="panelHeader">
                <div>
                  <h2>Investment Options</h2>
                  <p>Each decision changes the next year of the country.</p>
                </div>
              </div>

              <div className="sectorGrid">
                {sectors.map((sector) => (
                  <div className="sectorCard" key={sector.name}>
                    <div className="sectorIcon">{sector.icon}</div>
                    <h3>{sector.name}</h3>
                    <p>{sector.description}</p>
                    <div className="sectorFooter">
                      <span>{formatMoney(sector.amount)}</span>
                      <button onClick={() => makeInvestment(sector)} disabled={loading}>
                        Invest
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel historyPanel">
              <div className="panelHeader">
                <div>
                  <h2>Investment History</h2>
                  <p>Previous decisions made in this simulation.</p>
                </div>
              </div>

              {investments.length === 0 ? (
                <p className="emptyText">No investments yet.</p>
              ) : (
                <div className="historyList">
                  {investments.map((item) => (
                    <div className="historyItem" key={item.investment_id}>
                      <div>
                        <strong>{item.sector_type}</strong>
                        <span>Turn {item.turn_number}</span>
                      </div>
                      <p>
                        {formatMoney(item.investment_amount)} | Dev +{item.development_effect} | Happiness {item.happiness_effect > 0 ? "+" : ""}
                        {item.happiness_effect}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
