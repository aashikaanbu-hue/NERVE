import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CloudRain,
  Gauge,
  Hospital,
  MapPinned,
  Menu,
  Network,
  Radio,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import { DashboardPage } from "./pages/DashboardPage";
import { AccessibilityMapPage } from "./pages/AccessibilityMapPage";
import { LoginPage } from "./pages/LoginPage";
import { RiskIntelligencePage } from "./pages/RiskIntelligencePage";
import { RoutePlanningPage } from "./pages/RoutePlanningPage";

type Health = {
  status: string;
  version: string;
  agentService: { status: string };
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

const agents = [
  {
    code: "01",
    name: "NERVE Sense",
    task: "Combines rainfall, terrain, road and field signals into a live risk picture.",
    Icon: Gauge,
    state: "Analysing live",
    tone: "sense",
  },
  {
    code: "02",
    name: "NERVE Impact",
    task: "Forecasts which communities and essential services could lose access.",
    Icon: Network,
    state: "3 areas watched",
    tone: "impact",
  },
  {
    code: "03",
    name: "NERVE Route",
    task: "Tests safer alternatives for ambulances, supplies and field teams.",
    Icon: RouteIcon,
    state: "Route ready",
    tone: "route",
  },
  {
    code: "04",
    name: "NERVE Command",
    task: "Turns evidence into an accountable response plan for human approval.",
    Icon: Radio,
    state: "Decision ready",
    tone: "command",
  },
] as const;

const roles = [
  {
    name: "Government Authority",
    detail:
      "Approve actions and see community-wide impact from one command view.",
    Icon: ShieldCheck,
  },
  {
    name: "Logistics Operator",
    detail:
      "Protect essential deliveries with live fleet and route coordination.",
    Icon: Truck,
  },
  {
    name: "Field Official",
    detail:
      "Verify incidents with location, evidence and low-network reporting.",
    Icon: MapPinned,
  },
  {
    name: "Driver",
    detail:
      "Follow approved routes and receive urgent changes while in transit.",
    Icon: RouteIcon,
  },
] as const;

function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Health service is unavailable.");
        return response.json();
      })
      .then((data: Health) => {
        setHealth(data);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  return { health, failed };
}

function Brand() {
  return (
    <Link className="image-brand" to="/" aria-label="NERVE home">
      <img
        src="/brand/nerve-logo-clean.png"
        alt="NERVE — North Eastern Region Vision and Efficiency"
      />
    </Link>
  );
}

function CommandMap() {
  return (
    <div
      className="command-card command-card-v8"
      aria-label="Live East Khasi Hills accessibility view"
    >
      <div className="card-top">
        <div className="live-title">
          <span className="pulse" />
          <div>
            <b>East Khasi Hills live access</b>
            <small>Situation updated 34 seconds ago</small>
          </div>
        </div>

        <span className="confidence-chip">
          <Sparkles /> 91% confidence
        </span>
      </div>

      <div className="map real-map">
        <iframe
          title="East Khasi Hills live accessibility map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=91.62%2C25.19%2C91.98%2C25.65&layer=mapnik"
          loading="eager"
          tabIndex={-1}
        />

        <div className="map-tone" aria-hidden="true" />
        <div className="map-vignette" aria-hidden="true" />

        <svg
          className="map-route-overlay"
          viewBox="0 0 760 430"
          role="img"
          aria-label="Highlighted corridor risk and safer alternative"
        >
          <path
            className="route-shadow"
            d="M610 76 C559 95 515 113 470 136 C426 158 393 176 351 188 C310 200 274 201 245 222 C216 244 214 276 222 308 C228 332 233 349 240 367"
          />
          <path
            className="route-open"
            d="M610 76 C559 95 515 113 470 136 C426 158 393 176 351 188 C310 200 274 201 245 222 C216 244 214 276 222 308"
          />
          <path
            className="route-risk"
            d="M222 308 C228 332 233 349 240 367"
          />
          <path
            className="route-alternative"
            d="M351 188 C392 210 406 247 382 278 C354 314 302 338 240 367"
          />

          <circle className="route-node route-node-start" cx="610" cy="76" r="5" />
          <circle className="route-node route-node-mid" cx="351" cy="188" r="5" />
          <circle className="route-node route-node-end" cx="240" cy="367" r="5" />
        </svg>

        <div className="risk-area" aria-hidden="true" />

        <span className="map-place map-place-shillong">
          <i /> Shillong
        </span>
        <span className="map-place map-place-mawphlang">
          <i /> Mawphlang
        </span>
        <span className="map-place map-place-sohra">
          <i /> Sohra
        </span>

        <div className="map-coordinate">LIVE GIS · 25.5788° N · 91.8933° E</div>

        <div className="weather">
          <CloudRain />
          <span>
            <small>WEATHER SIGNAL</small>
            <b>Heavy rain · 42 mm</b>
          </span>
        </div>

        <div className="hazard">
          <AlertTriangle />
          <span>
            <small>SOHRA APPROACH</small>
            <b>High landslide risk · 84/100</b>
          </span>
        </div>

        <div className="vehicle vehicle-v8">
          <Truck />
          <span>MED-04</span>
        </div>

        <span className="map-attribution">© OpenStreetMap contributors</span>

        <div className="legend">
          <span>
            <i className="g" />
            Monitored corridor
          </span>
          <span>
            <i className="r" />
            Restricted section
          </span>
          <span>
            <i className="c" />
            Proposed diversion
          </span>
        </div>
      </div>

      <div className="decision-strip">
        <div className="decision-copy">
          <span className="decision-icon">
            <Bot />
          </span>
          <span>
            <small>NERVE COMMAND · ACTION READY</small>
            <b>Reroute medical delivery via Mawphlang corridor</b>
          </span>
        </div>

        <div className="decision-meta">
          <span>
            <b>18 min</b>
            <small>time saved</small>
          </span>
          <span>
            <b>3</b>
            <small>villages protected</small>
          </span>
        </div>

        <Link to="/login">
          Review plan <ArrowRight />
        </Link>
      </div>
    </div>
  );
}

function Landing() {
  const { health, failed } = useHealth();
  const [menu, setMenu] = useState(false);

  return (
    <div className="site">
      <header>
        <div className="shell nav">
          <Brand />

          <nav className={menu ? "open" : ""} aria-label="Primary navigation">
            <a href="#platform" onClick={() => setMenu(false)}>
              Platform
            </a>
            <a href="#operations" onClick={() => setMenu(false)}>
              Live operations
            </a>
            <a href="#agents" onClick={() => setMenu(false)}>
              AI agents
            </a>
            <a href="#impact" onClick={() => setMenu(false)}>
              Workspaces
            </a>
          </nav>

          <div className="nav-right">
            <span className={`status ${health ? "ok" : failed ? "bad" : ""}`}>
              <i />
              {health
                ? "All systems live"
                : failed
                  ? "Services offline"
                  : "Connecting"}
            </span>

            <Link className="login-link" to="/login">
              Enter platform <ArrowRight />
            </Link>

            <button
              type="button"
              className="menu"
              aria-label={
                menu ? "Close navigation menu" : "Open navigation menu"
              }
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="platform">
          <div className="hero-ambient ambient-one" />
          <div className="hero-ambient ambient-two" />
          <div className="hero-lines" />

          <div className="shell hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span>
                  <Zap />
                  PREDICT RISK. PRESERVE ACCESS. PROTECT COMMUNITIES.
                </span>
                <i />
                EAST KHASI HILLS PILOT
              </div>

              <h1>
                <span className="hero-headline-line">See the road at risk.</span>
                <em>Move essentials first.</em>
              </h1>

              <p>
                NERVE turns rainfall, terrain and field evidence into one clear
                decision: who could lose access, which route is safer and what
                must move now.
              </p>

              <div className="hero-alert">
                <span className="hero-alert-icon">
                  <AlertTriangle />
                </span>

                <span className="hero-alert-copy">
                  <small>ACTIVE ACCESS WATCH</small>
                  <b>Shillong–Sohra corridor</b>
                </span>

                <span className="hero-alert-stat">
                  <b>84 / 100</b>
                  <small>landslide risk</small>
                </span>

                <span className="hero-alert-stat">
                  <b>3 villages</b>
                  <small>in isolation window</small>
                </span>
              </div>

              <div className="actions">
                <Link className="primary" to="/login">
                  Enter NERVE <ArrowRight />
                </Link>
                <a className="secondary" href="#agents">
                  <Bot /> See the agent workflow
                </a>
              </div>

              <div className="hero-proof">
                <div>
                  <b>04</b>
                  <span>
                    specialist
                    <br />
                    AI agents
                  </span>
                </div>
                <div>
                  <b>&lt; 60s</b>
                  <span>
                    decision
                    <br />
                    refresh
                  </span>
                </div>
                <div>
                  <b>100%</b>
                  <span>
                    human-reviewed
                    <br />
                    critical action
                  </span>
                </div>
              </div>
            </div>

            <CommandMap />
          </div>

          <div className="shell trust-row">
            <span>
              <CheckCircle2 />
              Explainable recommendations
            </span>
            <span>
              <CheckCircle2 />
              Human approval controls
            </span>
            <span>
              <CheckCircle2 />
              Low-network field access
            </span>
            <span>
              <CheckCircle2 />
              Complete audit trail
            </span>
          </div>
        </section>

        <section className="signal-bar" aria-label="Live operational updates">
          <div className="shell signal-grid">
            <div className="signal-label">
              <Radio /> LIVE REGION SIGNALS
            </div>
            <div>
              <AlertTriangle />
              <span>
                <b>Shillong–Sohra</b> Landslide risk elevated
              </span>
            </div>
            <div>
              <Truck />
              <span>
                <b>MED-204</b> Safer route ready
              </span>
            </div>
            <div>
              <CloudRain />
              <span>
                <b>Mawsynram</b> Heavy rain watch
              </span>
            </div>
          </div>
        </section>

        <div className="immersive-world-v12">
          <div className="world-atmosphere-v12" aria-hidden="true">
            <span className="world-grid-v12" />
            <span className="world-orbit-v12 orbit-a-v12" />
            <span className="world-orbit-v12 orbit-b-v12" />
            <span className="world-glow-v12 glow-a-v12" />
            <span className="world-glow-v12 glow-b-v12" />
            <span className="world-glow-v12 glow-c-v12" />
            <span className="world-signal-v12 signal-a-v12" />
            <span className="world-signal-v12 signal-b-v12" />
            <span className="world-signal-v12 signal-c-v12" />
          </div>

        <section className="metrics" id="operations">
          <div className="shell operations-v9">
            <div className="operations-heading">
              <div>
                <span>LIVE OPERATIONS</span>
                <h2>Regional access, in one decision view.</h2>
              </div>

              <div className="operations-live-state">
                <i />
                <span>
                  <b>Data fusion active</b>
                  <small>Weather · terrain · field · logistics</small>
                </span>
              </div>
            </div>

            <div className="operations-console">
              <article className="access-intelligence-card">
                <header>
                  <span className="metric-icon teal">
                    <RouteIcon />
                  </span>

                  <span>
                    <small>REGIONAL ACCESSIBILITY INDEX</small>
                    <b>Shillong–Sohra pilot network</b>
                  </span>

                  <em><i /> LIVE</em>
                </header>

                <div className="access-score-row">
                  <span>
                    <b>92.4</b>
                    <small>% accessible now</small>
                  </span>

                  <span className="access-change">
                    <b>↗ 1.8%</b>
                    <small>vs. yesterday</small>
                  </span>
                </div>

                <div className="access-chart" aria-label="24 hour accessibility trend">
                  <svg viewBox="0 0 720 230" role="img">
                    <defs>
                      <linearGradient id="accessAreaV9" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#35d6ba" stopOpacity="0.34" />
                        <stop offset="100%" stopColor="#35d6ba" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <path className="chart-grid" d="M24 46 H696 M24 104 H696 M24 162 H696" />
                    <path
                      className="chart-area"
                      d="M24 145 C82 134 112 139 161 123 C216 105 246 117 299 96 C352 75 389 88 438 70 C493 51 535 72 579 55 C625 38 657 45 696 31 L696 198 L24 198 Z"
                    />
                    <path
                      className="chart-line"
                      d="M24 145 C82 134 112 139 161 123 C216 105 246 117 299 96 C352 75 389 88 438 70 C493 51 535 72 579 55 C625 38 657 45 696 31"
                    />
                    <circle className="chart-current-ring" cx="696" cy="31" r="10" />
                    <circle className="chart-current" cx="696" cy="31" r="5" />
                  </svg>

                  <div className="chart-scale">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>NOW</span>
                  </div>
                </div>

                <footer>
                  <span><i className="source weather-source" /> Rainfall forecast</span>
                  <span><i className="source terrain-source" /> Terrain risk</span>
                  <span><i className="source field-source" /> Field evidence</span>
                </footer>
              </article>

              <div className="operations-status-rail">
                <article className="status-card critical-status">
                  <span className="metric-icon orange"><AlertTriangle /></span>
                  <span>
                    <small>CRITICAL CORRIDORS</small>
                    <b>04</b>
                    <p>1 action awaits human approval</p>
                  </span>
                  <div className="status-meter"><i /></div>
                </article>

                <article className="status-card delivery-status">
                  <span className="metric-icon blue"><Truck /></span>
                  <span>
                    <small>ESSENTIAL DELIVERIES</small>
                    <b>24</b>
                    <p>21 on plan · 3 high priority</p>
                  </span>
                  <div className="delivery-dots" aria-hidden="true">
                    <i /><i /><i /><i /><i /><i /><i /><i />
                  </div>
                </article>

                <article className="community-status">
                  <span className="metric-icon violet"><Users /></span>
                  <span>
                    <small>COMMUNITIES PROTECTED</small>
                    <b>18 <em>across East Khasi Hills</em></b>
                  </span>
                  <CheckCircle2 />
                </article>
              </div>
            </div>

            <div className="operations-action-strip">
              <span className="action-signal"><Radio /></span>
              <span>
                <small>PRIORITY ACTION · NERVE COMMAND</small>
                <b>Medical delivery MED-204 rerouted before the isolation window.</b>
              </span>
              <span className="action-stat"><b>18 min</b><small>time saved</small></span>
              <span className="action-stat"><b>3</b><small>villages covered</small></span>
              <Link to="/login">Open command view <ArrowRight /></Link>
            </div>
          </div>
        </section>

        <section className="intelligence intelligence-v10" id="agents">
          <div className="shell">
            <div className="section-title agents-title-v10">
              <div>
                <span>COORDINATED INTELLIGENCE</span>
                <h2>Four specialists. One live decision network.</h2>
              </div>
              <p>
                Every recommendation carries evidence, confidence and a clear
                human checkpoint before action reaches the field.
              </p>
            </div>

            <div className="agent-command-layout">
              <article className="agent-network-card">
                <header>
                  <span>
                    <small>LIVE ORCHESTRATION</small>
                    <b>East Khasi Hills decision cycle</b>
                  </span>
                  <em><i /> 4 agents connected</em>
                </header>

                <div className="agent-network" aria-label="NERVE agent collaboration network">
                  <svg viewBox="0 0 780 430" aria-hidden="true">
                    <defs>
                      <linearGradient id="agentLinkV10" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#35d8bd" />
                        <stop offset="52%" stopColor="#39bee8" />
                        <stop offset="100%" stopColor="#a381ff" />
                      </linearGradient>
                    </defs>
                    <path className="agent-link agent-link-one" d="M166 112 C250 108 284 166 390 214" />
                    <path className="agent-link agent-link-two" d="M614 112 C530 110 497 165 390 214" />
                    <path className="agent-link agent-link-three" d="M166 330 C250 326 285 265 390 214" />
                    <path className="agent-link agent-link-four" d="M614 330 C530 328 496 265 390 214" />
                    <circle className="agent-signal signal-one" cx="166" cy="112" r="4" />
                    <circle className="agent-signal signal-two" cx="614" cy="112" r="4" />
                    <circle className="agent-signal signal-three" cx="166" cy="330" r="4" />
                    <circle className="agent-signal signal-four" cx="614" cy="330" r="4" />
                  </svg>

                  {agents.map(({ code, name, Icon, state, tone }, index) => (
                    <div className={`agent-node node-${index + 1} ${tone}`} key={name}>
                      <span><Icon /></span>
                      <div>
                        <small>{code} · {state}</small>
                        <b>{name}</b>
                      </div>
                    </div>
                  ))}

                  <div className="agent-human-gate">
                    <span><ShieldCheck /></span>
                    <small>HUMAN GATE</small>
                    <b>Review &amp; approve</b>
                    <em>Evidence attached</em>
                  </div>
                </div>

                <footer className="agent-decision-event">
                  <span><Bot /></span>
                  <div>
                    <small>DECISION ASSEMBLED · 12 SEC AGO</small>
                    <b>Reroute MED-204 before the Sohra access window closes.</b>
                  </div>
                  <span className="decision-confidence"><b>91%</b><small>confidence</small></span>
                </footer>
              </article>

              <aside className="agent-activity-panel">
                <header>
                  <span>
                    <small>AGENT ACTIVITY</small>
                    <b>What changed now</b>
                  </span>
                  <Radio />
                </header>

                {agents.map(({ name, task, Icon, tone }, index) => (
                  <article className={`activity-row ${tone}`} key={name}>
                    <span><Icon /></span>
                    <div>
                      <small>{index === 0 ? "8 sec" : `${index * 7 + 12} sec`} ago</small>
                      <b>{name}</b>
                      <p>{task}</p>
                    </div>
                    <i />
                  </article>
                ))}

                <Link to="/login">
                  Open decision workspace <ArrowRight />
                </Link>
              </aside>
            </div>

            <div className="flow flow-v10" aria-label="NERVE decision workflow">
              {[
                "Observe",
                "Assess risk",
                "Forecast impact",
                "Plan response",
                "Human approval",
                "Monitor",
              ].map((step, index) => (
                <div key={step} className={index < 5 ? "complete" : "active"}>
                  <small>0{index + 1}</small>
                  <b>{step}</b>
                  <i />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="roles roles-v10" id="impact">
          <div className="role-orb" />
          <div className="shell">
            <div className="roles-heading-v10">
              <div>
                <span>ROLE-BASED OPERATIONS</span>
                <h2>One platform. Four operational realities.</h2>
              </div>
              <p>
                Each workspace turns the same regional intelligence into the
                exact decisions, evidence and routes that role needs.
              </p>
            </div>

            <div className="workspace-grid-v10">
              {roles.map(({ name, detail, Icon }, index) => (
                <article className={`workspace-card workspace-${index + 1}`} key={name}>
                  <header>
                    <span>0{index + 1}</span>
                    <i><Icon /></i>
                  </header>

                  <div className="workspace-copy-v10">
                    <small>{index === 0 ? "COMMAND & APPROVAL" : index === 1 ? "FLEET & DELIVERY" : index === 2 ? "EVIDENCE & VERIFICATION" : "SAFE JOURNEY"}</small>
                    <h3>{name}</h3>
                    <p>{detail}</p>
                  </div>

                  {index === 0 && (
                    <div className="authority-preview">
                      <div>
                        <small>PRIORITY APPROVALS</small>
                        <b>02</b>
                        <span><i /> Human review required</span>
                      </div>
                      <div className="authority-risk-row">
                        <span><AlertTriangle /> Shillong–Sohra corridor</span>
                        <b>84 / 100</b>
                      </div>
                      <div className="authority-risk-row safe">
                        <span><RouteIcon /> Mawphlang diversion</span>
                        <b>READY</b>
                      </div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="logistics-preview">
                      <div className="logistics-track">
                        <i /><i /><i />
                        <span><Truck /></span>
                      </div>
                      <div>
                        <span><small>MED-204</small><b>Medical delivery</b></span>
                        <em>Safer route active · ETA 38 min</em>
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="field-preview">
                      <span><CheckCircle2 /><b>Location verified</b><small>25.2729° N</small></span>
                      <span><CloudRain /><b>Rain evidence</b><small>Uploaded now</small></span>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="driver-preview">
                      <span><RouteIcon /></span>
                      <div><small>APPROVED ROUTE</small><b>18 min faster</b><em>Next alert in 6.4 km</em></div>
                    </div>
                  )}

                  <Link to="/login" aria-label={`Open ${name} workspace`}>
                    Open workspace <ArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell">
          <Brand />
          <p>North Eastern Region Vision &amp; Efficiency</p>
          <span>
            Foundation v{health?.version ?? "0.1.0"} · Human-supervised Agentic
            AI
          </span>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route
        path="/dashboard/accessibility"
        element={<AccessibilityMapPage />}
      />
      <Route
        path="/dashboard/risk-intelligence"
        element={<RiskIntelligencePage />}
      />
      <Route
  path="/dashboard/route-planning"
  element={<RoutePlanningPage />}
/>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
