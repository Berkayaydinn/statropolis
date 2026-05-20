import { useEffect, useRef, useState } from "react";
import "./App.css";
import BuilderGame from "./BuilderGame.jsx";
import WorldMap from "./WorldMap.jsx";

const API_BASE = "http://127.0.0.1:8000";

const MAX_TURNS = 12;
const TARGET_DEV_GAIN = 45;
const TARGET_HAPPINESS_GAIN = 5;
const MIN_FINAL_BUDGET_RATIO = 0.2;

const fallbackCountries = [
  { country_id: 1, country_name: "Turkey" },
  { country_id: 2, country_name: "Germany" },
  { country_id: 3, country_name: "Brazil" },
  { country_id: 4, country_name: "Japan" },
  { country_id: 5, country_name: "South Africa" },
];

const sectors = [
  {
    name: "Education",
    icon: "🎓",
    description: "Builds schools. Strong long-term development gain with a small happiness boost.",
    amount: 100000000,
    dev: "+4 Dev",
    happiness: "+2 Hap",
    risk: "Safe",
  },
  {
    name: "Healthcare",
    icon: "🏥",
    description: "Builds hospitals. Best for protecting happiness and social stability.",
    amount: 100000000,
    dev: "+2 Dev",
    happiness: "+5 Hap",
    risk: "Safe",
  },
  {
    name: "Industry",
    icon: "🏭",
    description: "Builds factories. Fast development, but people may dislike pollution and pressure.",
    amount: 150000000,
    dev: "+6 Dev",
    happiness: "-1 Hap",
    risk: "Risky",
  },
  {
    name: "Infrastructure",
    icon: "🚆",
    description: "Builds roads and transit. Balanced growth that supports future progress.",
    amount: 150000000,
    dev: "+5 Dev",
    happiness: "+1 Hap",
    risk: "Balanced",
  },
  {
    name: "Military",
    icon: "🛡️",
    description: "Builds defense facilities. Gives limited development but can lower happiness.",
    amount: 120000000,
    dev: "+2 Dev",
    happiness: "-2 Hap",
    risk: "High Risk",
  },
  {
    name: "Environment",
    icon: "🌱",
    description: "Builds parks and green areas. Slower development but helps happiness.",
    amount: 100000000,
    dev: "+3 Dev",
    happiness: "+4 Hap",
    risk: "Stable",
  },
];

const CRISIS_EVENTS = [
  {
    id: "drought",
    icon: "☀️",
    title: "Severe Drought",
    desc: "Water shortages hurt agriculture and lower public confidence.",
    devHit: -4,
    hapHit: -7,
    budgetHit: -70000000,
    responseCost: 50000000,
    turn: 4,
  },
  {
    id: "recession",
    icon: "📉",
    title: "Economic Recession",
    desc: "Global markets weaken national income and slow progress.",
    devHit: -6,
    hapHit: -6,
    budgetHit: -180000000,
    responseCost: 100000000,
    turn: 8,
  },
  {
    id: "earthquake",
    icon: "🌋",
    title: "Natural Disaster",
    desc: "A disaster damages infrastructure and creates public stress.",
    devHit: -8,
    hapHit: -7,
    budgetHit: -150000000,
    responseCost: 90000000,
    turn: 11,
  },
];

const GOOD_EVENTS = [
  {
    id: "tourism",
    icon: "✈️",
    title: "Tourism Boom",
    desc: "Visitors bring money and improve the country image.",
    devGain: 3,
    hapGain: 3,
    budgetGain: 130000000,
    boostCost: 60000000,
    turn: 6,
  },
  {
    id: "tech",
    icon: "💡",
    title: "Tech Innovation",
    desc: "A local innovation creates a chance for faster development.",
    devGain: 6,
    hapGain: 2,
    budgetGain: 80000000,
    boostCost: 80000000,
    turn: 10,
  },
];

function LandingHero({ countriesCount, gameState, username, onStartClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas.parentElement;
    const ctx = canvas.getContext("2d");

    const colors = ["#0d1b35", "#102040", "#0e1c38", "#0c1a30", "#111f3d"];
    const buildings = [];
    let frameId;
    let t = 0;

    function resize() {
      canvas.width = root.offsetWidth;
      canvas.height = root.offsetHeight;
    }

    function initBuildings() {
      buildings.length = 0;

      const width = canvas.width;
      const height = canvas.height;
      let x = -10;

      while (x < width + 30) {
        const buildingWidth = 22 + Math.random() * 38;
        const buildingHeight = 60 + Math.random() * (height * 0.52);
        const floors = Math.floor(buildingHeight / 18);
        const windowCols = Math.max(1, Math.floor((buildingWidth - 10) / 14));
        const windows = [];

        for (let row = 0; row < floors; row++) {
          for (let col = 0; col < windowCols; col++) {
            windows.push(Math.random() > 0.45);
          }
        }

        buildings.push({
          x,
          width: buildingWidth,
          height: buildingHeight,
          color: colors[Math.floor(Math.random() * colors.length)],
          floors,
          windowCols,
          windows,
        });

        x += buildingWidth + 3 + Math.random() * 6;
      }
    }

    function draw() {
      const width = canvas.width;
      const height = canvas.height;
      const baseY = height * 0.78;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#07101f";
      ctx.fillRect(0, 0, width, height * 0.55);

      ctx.fillStyle = "#0b1828";
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      for (let i = 0; i < 90; i++) {
        const sx = ((42 * (i * 7 + 3)) % 1000) / 1000 * width;
        const sy = ((42 * (i * 13 + 5)) % 1000) / 1000 * height * 0.45;
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.012 + i));

        ctx.fillStyle = `rgba(200,220,255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const horizon = ctx.createLinearGradient(0, height * 0.48, 0, height * 0.6);
      horizon.addColorStop(0, "rgba(30,80,160,0.18)");
      horizon.addColorStop(1, "rgba(10,20,50,0)");
      ctx.fillStyle = horizon;
      ctx.fillRect(0, height * 0.45, width, height * 0.18);

      ctx.fillStyle = "#060d1a";
      ctx.fillRect(0, baseY, width, height * 0.22);
      ctx.fillStyle = "rgba(15,35,80,0.3)";
      ctx.fillRect(0, height * 0.76, width, 4);

      for (const building of buildings) {
        const y = baseY - building.height;

        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, y, building.width, building.height);

        ctx.fillStyle = "rgba(100,160,255,0.08)";
        ctx.fillRect(building.x, y, building.width, 2);

        const padX = 5;
        const padY = 8;
        const winW = 6;
        const winH = 7;
        const gapX = 8;
        const gapY = 11;

        for (let row = 0; row < building.floors; row++) {
          for (let col = 0; col < building.windowCols; col++) {
            const index = row * building.windowCols + col;
            const wx = building.x + padX + col * gapX;
            const wy = y + padY + row * gapY;

            if (wx + winW > building.x + building.width - 2) continue;
            if (wy + winH > baseY - 2) continue;

            const lightAlpha = 0.55 + 0.3 * Math.abs(Math.sin(t * 0.005 + index));

            ctx.fillStyle = building.windows[index]
              ? `rgba(200,232,255,${lightAlpha})`
              : "#1a2d50";

            ctx.fillRect(wx, wy, winW, winH);
          }
        }
      }

      for (let i = 0; i < width; i += 55) {
        const lx = i + 10;

        ctx.strokeStyle = "rgba(255,210,120,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, baseY);
        ctx.lineTo(lx, baseY - 18);
        ctx.lineTo(lx + 8, baseY - 18);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,220,140,0.9)";
        ctx.beginPath();
        ctx.arc(lx + 8, baseY - 18, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      t++;
      frameId = requestAnimationFrame(draw);
    }

    resize();
    initBuildings();
    draw();

    function handleResize() {
      resize();
      initBuildings();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section className="landingHero">
      <canvas ref={canvasRef} className="landingCanvas" />

      <div className="landingOverlay">
        <div className="landingTag">Global Strategy Simulation</div>

        <h1 className="landingTitle">
          Stat<span>ropolis</span>
        </h1>

        <p className="landingSub">
          A data-driven country management simulation.
          <br />
          Real data. Real decisions. Real consequences.
        </p>

        <div className="landingButtons">
          <button className="landingPrimary" onClick={onStartClick}>
            Start managing ↗
          </button>

          <button
            className="landingSecondary"
            onClick={() => {
              document.querySelector(".missionPanel")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            View mission
          </button>
        </div>

        <div className="landingStats">
          <div>
            <span>Countries</span>
            <strong className="cyanText">{countriesCount || 195}</strong>
          </div>

          <div>
            <span>Active player</span>
            <strong className="greenText">{username || "Guest"}</strong>
          </div>

          <div>
            <span>Current dev.</span>
            <strong>{gameState ? Number(gameState.development_score).toFixed(1) : "0.0"}</strong>
          </div>

          <div>
            <span>Top country</span>
            <strong className="cyanText">{gameState?.country_name || "—"}</strong>
          </div>
        </div>
      </div>

      <div className="landingTicker">
        <div className="landingTickerInner">
          <span>Education <b>+development</b></span>
          <span>Healthcare <b>+happiness</b></span>
          <span>Industry <em>-happiness risk</em></span>
          <span>Infrastructure <b>+future growth</b></span>
          <span>Environment <b>+stability</b></span>
          <span>Military <em>high risk</em></span>
          <span>Campaign goal: balanced growth before turn 12</span>
          <span>Education <b>+development</b></span>
          <span>Healthcare <b>+happiness</b></span>
        </div>
      </div>
    </section>
  );
}

function EventModal({ event, onResolve }) {
  const isGood = event.budgetGain !== undefined;
  const accent = isGood ? "#5fe0b0" : "#f59e0b";

  const chips = isGood
    ? [
        `Dev +${event.devGain}`,
        `Hap +${event.hapGain}`,
        `+$${(event.budgetGain / 1000000).toFixed(0)}M`,
      ]
    : [
        `Dev ${event.devHit}`,
        `Hap ${event.hapHit}`,
        `-$${Math.abs(event.budgetHit / 1000000).toFixed(0)}M`,
      ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(4,8,20,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          background: "rgba(7,18,34,0.98)",
          border: `1.5px solid ${accent}`,
          borderRadius: 20,
          padding: "34px 38px",
          maxWidth: 480,
          width: "90%",
          textAlign: "center",
          boxShadow: `0 0 70px ${isGood ? "rgba(95,224,176,0.18)" : "rgba(245,158,11,0.18)"}`,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 10 }}>{event.icon}</div>

        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 8,
            fontWeight: 800,
          }}
        >
          {isGood ? "Opportunity Event" : "Crisis Event"}
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: 24, color: "#eef6ff" }}>
          {event.title}
        </h3>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {event.desc}
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {chips.map((chip) => (
            <span
              key={chip}
              style={{
                background: `${accent}18`,
                border: `0.5px solid ${accent}55`,
                borderRadius: 99,
                padding: "4px 12px",
                fontSize: 13,
                color: accent,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        {!isGood ? (
          <>
            <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
              Choose how to react. Responding reduces the damage, but costs extra money.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => onResolve("respond")}
                style={{
                  background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color: "#04111f",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Respond
                <br />
                <small style={{ fontWeight: 600 }}>less damage, extra cost</small>
              </button>

              <button
                onClick={() => onResolve("ignore")}
                style={{
                  background: "rgba(7,18,34,0.82)",
                  color: "#eaf7ff",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Ignore
                <br />
                <small style={{ fontWeight: 600 }}>full damage, no cost</small>
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
              Accept the opportunity normally or spend money to boost its impact.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => onResolve("boost")}
                style={{
                  background: "linear-gradient(135deg,#5fe0b0,#38bdf8)",
                  color: "#04111f",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Boost it
                <br />
                <small style={{ fontWeight: 600 }}>bigger gain, costs money</small>
              </button>

              <button
                onClick={() => onResolve("accept")}
                style={{
                  background: "rgba(7,18,34,0.82)",
                  color: "#eaf7ff",
                  border: "1px solid rgba(95,224,176,0.35)",
                  borderRadius: 12,
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Accept
                <br />
                <small style={{ fontWeight: 600 }}>normal bonus</small>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerModal({ usernameInput, setUsernameInput, onStart }) {
  return (
    <div className="playerModalBackdrop">
      <div className="playerModalCard">
        <div className="landingTag">Player Profile</div>
        <h2>Enter your username</h2>
        <p>
          Your username will be stored in the database and shown on the leaderboard.
          This makes each campaign trackable for the demo.
        </p>

        <div className="playerInputRow">
          <input
            value={usernameInput}
            onChange={(event) => setUsernameInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onStart();
              }
            }}
            placeholder="Example: Berkay"
            maxLength={30}
            autoFocus
          />
          <button className="primaryButton" onClick={onStart}>
            Continue
          </button>
        </div>

        <span className="playerModalHint">
          CRUD note: users are created/read/updated/deleted through backend user endpoints.
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [message, setMessage] = useState("Choose a country on the map to start the simulation.");
  const [loading, setLoading] = useState(false);
  const [builderEvent, setBuilderEvent] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [pendingState, setPendingState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [username, setUsername] = useState(() => localStorage.getItem("statropolis_username") || "");
  const [usernameInput, setUsernameInput] = useState(() => localStorage.getItem("statropolis_username") || "");

  useEffect(() => {
    loadCountries();
    loadLeaderboard();
  }, []);

  function saveUsername() {
    const cleaned = usernameInput.trim();

    if (cleaned.length < 2) {
      setMessage("Username must be at least 2 characters.");
      return;
    }

    localStorage.setItem("statropolis_username", cleaned);
    setUsername(cleaned);
    setMessage(`Welcome, ${cleaned}. Choose a country to start your campaign.`);
  }

  function changePlayer() {
    localStorage.removeItem("statropolis_username");
    setUsername("");
    setUsernameInput("");
    setSelectedCountry(null);
    setGameState(null);
    setInvestments([]);
    setBuilderEvent(null);
    setCampaign(null);
    setGameResult(null);
    setActiveEvent(null);
    setPendingState(null);
    setMessage("Enter a username to start a new player profile.");
  }

  async function loadCountries() {
    try {
      const response = await fetch(`${API_BASE}/countries`);

      if (!response.ok) {
        throw new Error("Countries request failed");
      }

      const data = await response.json();
      setCountries(Array.isArray(data) && data.length > 0 ? data : fallbackCountries);
    } catch {
      setCountries(fallbackCountries);
      setMessage("Backend is not connected yet. The map is running with demo countries.");
    }
  }

  async function loadLeaderboard() {
    try {
      const response = await fetch(`${API_BASE}/analytics/leaderboard`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {
      // I keep this silent because the game can still run without analytics.
      setLeaderboard([]);
    }
  }

  function handleCountrySelect(country) {
    setSelectedCountry(country);
    setGameState(null);
    setInvestments([]);
    setBuilderEvent(null);
    setCampaign(null);
    setGameResult(null);
    setActiveEvent(null);
    setPendingState(null);
    setMessage(`${country.country_name} selected. Start the simulation when you are ready.`);
  }

  async function startGame() {
    if (!username) {
      setMessage("Enter a username before starting the campaign.");
      return;
    }

    if (!selectedCountry) {
      setMessage("Click a country on the map first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/start-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country_id: selectedCountry.country_id, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Could not start the game.");
        setLoading(false);
        return;
      }

      const stateResponse = await fetch(`${API_BASE}/game-state/${data.player_country_id}`);

      if (!stateResponse.ok) {
        throw new Error("Game state request failed");
      }

      const state = await stateResponse.json();

      const targetDevelopment = Number(state.development_score) + TARGET_DEV_GAIN;
      const targetHappiness = Math.min(95, Number(state.happiness) + TARGET_HAPPINESS_GAIN);
      const minimumFinalBudget = Number(state.budget) * MIN_FINAL_BUDGET_RATIO;

      setGameState(state);
      setInvestments([]);
      setBuilderEvent(null);
      setGameResult(null);
      setActiveEvent(null);
      setPendingState(null);

      setCampaign({
        startingDevelopment: Number(state.development_score),
        startingHappiness: Number(state.happiness),
        startingBudget: Number(state.budget),
        targetDevelopment,
        targetHappiness,
        minimumFinalBudget,
      });

      setMessage(
        `${username} started with ${state.country_name}. Reach the campaign targets before turn ${MAX_TURNS}.`
      );

      loadLeaderboard();
    } catch {
      setMessage("Backend connection failed. Make sure FastAPI is running on port 8000.");
    }

    setLoading(false);
  }

  function getEventForTurn(turnNumber) {
    const crisis = CRISIS_EVENTS.find((event) => event.turn === turnNumber);

    if (crisis) {
      return crisis;
    }

    const good = GOOD_EVENTS.find((event) => event.turn === turnNumber);

    if (good) {
      return good;
    }

    return null;
  }

  function applyEventToState(state, event, choice) {
    const isGood = event.budgetGain !== undefined;

    if (isGood) {
      const boosted = choice === "boost";

      return {
        ...state,
        development_score: Math.max(
          0,
          Number(state.development_score) + (boosted ? event.devGain * 1.5 : event.devGain)
        ),
        happiness: Math.min(
          100,
          Math.max(0, Number(state.happiness) + (boosted ? event.hapGain * 1.4 : event.hapGain))
        ),
        budget: Math.max(
          0,
          Number(state.budget) + event.budgetGain - (boosted ? event.boostCost : 0)
        ),
      };
    }

    const responded = choice === "respond";

    return {
      ...state,
      development_score: Math.max(
        0,
        Number(state.development_score) + (responded ? event.devHit * 0.45 : event.devHit)
      ),
      happiness: Math.min(
        100,
        Math.max(0, Number(state.happiness) + (responded ? event.hapHit * 0.45 : event.hapHit))
      ),
      budget: Math.max(
        0,
        Number(state.budget) + event.budgetHit - (responded ? event.responseCost : 0)
      ),
    };
  }

  async function persistEventState(nextState) {
    const response = await fetch(`${API_BASE}/apply-event-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_country_id: nextState.player_country_id,
        budget: Number(nextState.budget),
        happiness: Number(nextState.happiness),
        development_score: Number(nextState.development_score),
      }),
    });

    if (!response.ok) {
      throw new Error("Event update failed");
    }

    return response.json();
  }

  async function resolveEvent(choice) {
    if (!activeEvent || !pendingState) {
      return;
    }

    setLoading(true);

    try {
      const nextState = applyEventToState(pendingState, activeEvent, choice);
      const savedState = await persistEventState(nextState);
      const isGood = activeEvent.budgetGain !== undefined;

      setGameState(savedState);
      setPendingState(null);
      setActiveEvent(null);

      if (isGood) {
        setMessage(
          choice === "boost"
            ? `${activeEvent.title}: you boosted the opportunity. Bigger gains, but it cost money.`
            : `${activeEvent.title}: you accepted the opportunity.`
        );
      } else {
        setMessage(
          choice === "respond"
            ? `${activeEvent.title}: you responded quickly and reduced the damage.`
            : `${activeEvent.title}: you ignored the crisis and took the full impact.`
        );
      }

      loadLeaderboard();

      const result = evaluateCampaign(savedState);

      if (result.finished) {
        setGameResult(result);
      }
    } catch {
      setMessage("Could not save the event result to the backend.");
    }

    setLoading(false);
  }

  async function makeInvestment(sector) {
    if (!gameState) {
      setMessage("Start a game before investing.");
      return;
    }

    if (activeEvent) {
      setMessage("Choose how to resolve the current event first.");
      return;
    }

    if (gameResult) {
      setMessage("This campaign is already finished. Select a country to start a new one.");
      return;
    }

    if (Number(gameState.turn_number) >= MAX_TURNS) {
      const result = evaluateCampaign(gameState, true);
      setGameResult(result);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_country_id: gameState.player_country_id,
          sector_type: sector.name,
          investment_amount: sector.amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Investment failed.");
        setLoading(false);
        return;
      }

      setGameState(data);
      setMessage(`${sector.name} investment completed. The city also changed visually.`);

      setBuilderEvent({
        sector: sector.name,
        time: Date.now(),
      });

      const historyResponse = await fetch(`${API_BASE}/investments/${gameState.player_country_id}`);

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setInvestments(Array.isArray(historyData) ? historyData : []);
      }

      loadLeaderboard();

      const newTurn = Number(data.turn_number);
      const event = getEventForTurn(newTurn);

      if (event) {
        setPendingState(data);
        setActiveEvent(event);
        setMessage(`Turn ${newTurn}: ${event.icon} ${event.title}. Choose how to respond.`);
      } else {
        const result = evaluateCampaign(data);

        if (result.finished) {
          setGameResult(result);
        }
      }
    } catch {
      setMessage("Could not send investment request.");
    }

    setLoading(false);
  }

  function fmtMoney(value) {
    if (value === null || value === undefined) {
      return "-";
    }

    return `$${Number(value).toLocaleString()}`;
  }

  function fmtNumber(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }

    return Number(value).toFixed(1);
  }

  function evaluateCampaign(state, forceEnd = false) {
    if (!campaign) {
      return { finished: false, win: false, title: "", description: "" };
    }

    const development = Number(state.development_score);
    const happiness = Number(state.happiness);
    const budget = Number(state.budget);
    const turn = Number(state.turn_number);

    const reachedDevelopment = development >= campaign.targetDevelopment;
    const reachedHappiness = happiness >= campaign.targetHappiness;
    const protectedBudget = budget >= campaign.minimumFinalBudget;

    const win = reachedDevelopment && reachedHappiness && protectedBudget;

    if (win) {
      return {
        finished: true,
        win: true,
        title: "You Win",
        description:
          "Your country reached the development and happiness targets while keeping enough budget. The strategy was balanced and sustainable.",
      };
    }

    if (forceEnd || turn >= MAX_TURNS) {
      let reason = "The campaign reached the final turn without meeting all targets.";

      if (!reachedDevelopment && !reachedHappiness) {
        reason = "Development and happiness both stayed below the required targets.";
      } else if (!reachedDevelopment) {
        reason = "Development did not grow enough before the final turn.";
      } else if (!reachedHappiness) {
        reason = "Happiness stayed too low. The country developed, but citizens were not satisfied.";
      } else if (!protectedBudget) {
        reason = "The targets were reached, but the final budget was too low to be sustainable.";
      }

      return {
        finished: true,
        win: false,
        title: "You Lose",
        description: reason,
      };
    }

    return { finished: false, win: false, title: "", description: "" };
  }

  function getProgress() {
    if (!gameState || !campaign) {
      return 0;
    }

    const devProgress =
      (Number(gameState.development_score) - campaign.startingDevelopment) /
      Math.max(1, campaign.targetDevelopment - campaign.startingDevelopment);

    const happyProgress =
      (Number(gameState.happiness) - campaign.startingHappiness) /
      Math.max(1, campaign.targetHappiness - campaign.startingHappiness);

    const budgetProgress = Number(gameState.budget) >= campaign.minimumFinalBudget ? 1 : 0.3;

    const total =
      Math.min(devProgress, 1) * 50 +
      Math.min(happyProgress, 1) * 35 +
      budgetProgress * 15;

    return Math.max(0, Math.min(100, Math.round(total)));
  }

  function getMissionStatus() {
    if (!gameState || !campaign) {
      return "Select a country and build a development strategy.";
    }

    if (gameResult) {
      return gameResult.win
        ? "Campaign completed successfully."
        : "Campaign failed. Review your strategy and try again.";
    }

    return `Reach ${campaign.targetDevelopment.toFixed(1)} development and ${campaign.targetHappiness.toFixed(1)} happiness before turn ${MAX_TURNS}.`;
  }

  function getYearsLeft() {
    if (!gameState) {
      return MAX_TURNS;
    }

    return Math.max(0, MAX_TURNS - Number(gameState.turn_number));
  }

  function resetCampaign() {
    setSelectedCountry(null);
    setGameState(null);
    setInvestments([]);
    setBuilderEvent(null);
    setCampaign(null);
    setGameResult(null);
    setActiveEvent(null);
    setPendingState(null);
    setMessage("Choose a country on the map to start a new simulation.");
    document.querySelector(".mapSection")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="page">
      <div className="mapOverlay" />

      {!username && (
        <PlayerModal
          usernameInput={usernameInput}
          setUsernameInput={setUsernameInput}
          onStart={saveUsername}
        />
      )}

      <LandingHero
        countriesCount={countries.length || 195}
        gameState={gameState}
        username={username}
        onStartClick={() => {
          document.querySelector(".mapSection")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="layout">
        <section className="panel missionPanel widePanel">
          <div className="missionTop">
            <div>
              <p className="missionLabel">Campaign Objective</p>
              <h2>{getMissionStatus()}</h2>
              <p>
                The campaign is limited to 12 turns. Development alone is not enough:
                the country also needs public happiness and a sustainable final budget.
                Events are occasional but can change the outcome.
              </p>
            </div>

            <div className="missionScore">
              <strong>{getProgress()}%</strong>
              <span>Campaign Progress</span>
            </div>
          </div>

          <div className="missionStats">
            <div>
              <span>Target Development</span>
              <strong>{campaign ? campaign.targetDevelopment.toFixed(1) : "—"}</strong>
            </div>

            <div>
              <span>Target Happiness</span>
              <strong>{campaign ? campaign.targetHappiness.toFixed(1) : "—"}</strong>
            </div>

            <div>
              <span>Years Left</span>
              <strong>{getYearsLeft()}</strong>
            </div>

            <div>
              <span>Minimum Final Budget</span>
              <strong>{campaign ? fmtMoney(campaign.minimumFinalBudget) : "—"}</strong>
            </div>
          </div>

          <div className="goalBar">
            <div style={{ width: `${getProgress()}%` }} />
          </div>
        </section>

        <section className="panel widePanel mapSection">
          <div className="panelHeader">
            <div>
              <h2>Select Your Country</h2>
              <p>
                {selectedCountry
                  ? `Selected: ${selectedCountry.country_name}`
                  : "Click a highlighted country on the map to choose your starting point."}
              </p>
            </div>

            <div className="panelActionRow">
              <button className="secondaryButton compactButton" onClick={changePlayer}>
                Change Player
              </button>

              {selectedCountry && (
                <button
                  className="primaryButton compactButton"
                  onClick={startGame}
                  disabled={loading || !username}
                >
                  {loading ? "Starting..." : `Start with ${selectedCountry.country_name}`}
                </button>
              )}
            </div>
          </div>

          <WorldMap countries={countries} onSelect={handleCountrySelect} />

          <div className="messageBox">{message}</div>
        </section>

        {gameState && (
          <section className="panel countryPanel">
            <div className="panelHeader">
              <div>
                <h2>{gameState.country_name}</h2>
                <p>Current simulation state</p>
              </div>

              <span className="turnBadge">
                Turn {gameState.turn_number} / {MAX_TURNS}
              </span>
            </div>

            <div className="statsGrid">
              <div className="statCard">
                <span>Budget</span>
                <strong>{fmtMoney(gameState.budget)}</strong>
              </div>

              <div className="statCard">
                <span>Happiness</span>
                <strong>{fmtNumber(gameState.happiness)}</strong>
              </div>

              <div className="statCard">
                <span>Development</span>
                <strong>{fmtNumber(gameState.development_score)}</strong>
              </div>

              <div className="statCard">
                <span>Income / Turn</span>
                <strong>{fmtMoney(gameState.income_per_turn)}</strong>
              </div>
            </div>
          </section>
        )}

        {gameState && (
          <section className="panel builderPanel widePanel">
            <div className="panelHeader">
              <div>
                <h2>City Builder — {gameState.country_name}</h2>
                <p>
                  Your investments physically shape the city. Schools, hospitals, factories,
                  transit, parks, bases, and roads appear as your strategy develops.
                </p>
              </div>
            </div>

            <BuilderGame
              countryName={gameState.country_name}
              latestInvestment={builderEvent}
              turnNumber={gameState.turn_number}
            />
          </section>
        )}

        {gameState && (
          <section className="panel investmentPanel widePanel">
            <div className="panelHeader">
              <div>
                <h2>Investment Strategy</h2>
                <p>Each decision affects the next year and adds a related structure to the city.</p>
              </div>
            </div>

            <div className="sectorGrid">
              {sectors.map((sector) => (
                <div className="sectorCard" key={sector.name}>
                  <div className="sectorTop">
                    <div className="sectorIcon">{sector.icon}</div>

                    <span className={`riskBadge risk${sector.risk.replaceAll(" ", "")}`}>
                      {sector.risk}
                    </span>
                  </div>

                  <h3>{sector.name}</h3>
                  <p>{sector.description}</p>

                  <div className="impactRow">
                    <span>{sector.dev}</span>
                    <span>{sector.happiness}</span>
                  </div>

                  <div className="sectorFooter">
                    <span>{fmtMoney(sector.amount)}</span>

                    <button
                      onClick={() => makeInvestment(sector)}
                      disabled={
                        loading ||
                        Boolean(activeEvent) ||
                        Number(gameState.turn_number) >= MAX_TURNS ||
                        Boolean(gameResult)
                      }
                    >
                      Invest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {gameState && (
          <section className="panel leaderboardPanel widePanel">
            <div className="panelHeader">
              <div>
                <h2>Leaderboard</h2>
                <p>Players are ranked by development score using the backend analytics query.</p>
              </div>

              <button className="primaryButton compactButton" onClick={loadLeaderboard}>
                Refresh
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <p className="emptyText">No leaderboard data yet. Start a campaign and make investments first.</p>
            ) : (
              <div className="leaderboardList">
                {leaderboard.slice(0, 5).map((row, index) => (
                  <div className="leaderboardItem" key={`${row.username}-${row.country_name}-${index}`}>
                    <strong>#{row.rank || index + 1}</strong>
                    <span>{row.username || "demo_player"}</span>
                    <span>{row.country_name}</span>
                    <span>Dev {fmtNumber(row.development_score)}</span>
                    <span>Hap {fmtNumber(row.happiness)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {gameState && (
          <section className="panel historyPanel widePanel">
            <div className="panelHeader">
              <div>
                <h2>Investment History</h2>
                <p>Previous investment decisions in this campaign.</p>
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
                      {fmtMoney(item.investment_amount)} | Dev +{item.development_effect} | Hap{" "}
                      {item.happiness_effect >= 0 ? "+" : ""}
                      {item.happiness_effect}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {gameResult && (
          <section className={`panel resultPanel widePanel ${gameResult.win ? "winPanel" : "losePanel"}`}>
            <div>
              <p className="missionLabel">Campaign Result</p>
              <h2>{gameResult.title}</h2>
              <p>{gameResult.description}</p>
            </div>

            <button className="primaryButton" onClick={resetCampaign}>
              Start New Campaign
            </button>
          </section>
        )}
      </main>

      {activeEvent && <EventModal event={activeEvent} onResolve={resolveEvent} />}
    </div>
  );
}
