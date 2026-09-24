import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Crosshair,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Navigation,
  Radio,
  Route,
  Satellite,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Waves,
  X,
  PackageCheck,
  Camera,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getAuthenticatedUser,
  getCurrentUser,
  logout,
  type AuthUser,
  type UserRole,
} from "../lib/auth";

import {
  getOperationsOverview,
  type OperationsOverview,
  type OverviewIncident,
  type OverviewRecommendation,
} from "../lib/operations";

import "./dashboard.css";
import "./risk-intelligence.css";

type SeverityFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const severityFilters: SeverityFilter[] = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

const roleLabels: Record<UserRole, string> = {
  GOVERNMENT_AUTHORITY: "Government Authority",
  LOGISTICS_OPERATOR: "Logistics Operator",
  FIELD_OFFICIAL: "Field Official",
  DRIVER: "Driver",
};

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently detected";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSeverityClass(value: string): string {
  const severity = value.toLowerCase();

  if (["critical", "high", "medium", "low"].includes(severity)) {
    return severity;
  }

  return "medium";
}

function getRecommendationAgent(agentType: string): string {
  const name = formatLabel(agentType).replace(/^Nerve /, "");
  return `NERVE ${name}`;
}

function formatConfidence(
  value: number,
): number {
  const percentage =
    value <= 1 ? value * 100 : value;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(percentage),
    ),
  );
}

function getIncidentPopulation(incident: OverviewIncident | null): number {
  if (!incident) return 0;

  return incident.communityImpacts.reduce(
    (total, impact) => total + (impact.estimatedPopulationAffected ?? 0),
    0,
  );
}

function getIsolationWindow(incident: OverviewIncident | null): number {
  if (!incident) return 0;

  return incident.communityImpacts.reduce(
    (highest, impact) =>
      Math.max(highest, impact.estimatedIsolationHours ?? 0),
    0,
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: OverviewRecommendation;
}) {
  const needsApproval =
    recommendation.requiresApproval && recommendation.status === "PENDING";

  return (
    <article className="risk-recommendation-card">
      <header>
        <span className="risk-agent-icon">
          <Bot />
        </span>

        <span>
          <small>{getRecommendationAgent(recommendation.agentType)}</small>
          <b>{formatLabel(recommendation.priority)} priority</b>
        </span>

        <em>
  {formatConfidence(
    recommendation.confidence,
  )}
  %
</em>
      </header>

      <h3>{recommendation.title}</h3>
      <p>{recommendation.reasoning}</p>

      <footer>
        <span className={needsApproval ? "approval pending" : "approval ready"}>
          {needsApproval ? <ShieldCheck /> : <CheckCircle2 />}
          {needsApproval ? "Human review required" : formatLabel(recommendation.status)}
        </span>

        <span>
          Evidence linked
          <ChevronRight />
        </span>
      </footer>
    </article>
  );
}

export function RiskIntelligencePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(getAuthenticatedUser());
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>("ALL");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRiskIntelligence(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();

        if (!mounted) return;
        setUser(currentUser);

        const operationalData = await getOperationsOverview();

        if (!mounted) return;
        setOverview(operationalData);
        setSelectedIncidentId(operationalData.incidents[0]?.id ?? null);
        setError(null);
      } catch (loadError) {
        if (!mounted) return;

        if (!getAuthenticatedUser()) {
          navigate("/login", { replace: true });
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Risk intelligence could not be loaded.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRiskIntelligence();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const filteredIncidents = useMemo(() => {
    const incidents = overview?.incidents ?? [];

    if (severity === "ALL") return incidents;

    return incidents.filter(
      (incident) => incident.severity.toUpperCase() === severity,
    );
  }, [overview, severity]);

  const selectedIncident =
    filteredIncidents.find((incident) => incident.id === selectedIncidentId) ??
    filteredIncidents[0] ??
    null;

  const relatedRecommendations = useMemo(() => {
    const recommendations = overview?.recommendations ?? [];

    if (!selectedIncident) return recommendations.slice(0, 3);

    const exactMatches = recommendations.filter(
      (recommendation) => recommendation.incident?.id === selectedIncident.id,
    );

    return (exactMatches.length > 0 ? exactMatches : recommendations).slice(0, 3);
  }, [overview, selectedIncident]);

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  if (loading && !user) {
    return (
      <div className="dashboard-loading">
        <Activity />
        <span>Loading risk intelligence...</span>
      </div>
    );
  }

  if (!user) return null;

  const metrics = overview?.metrics;
  const highestRisk = Math.max(
    0,
    ...(overview?.incidents.map((incident) => incident.riskScore) ?? []),
  );
  const affectedPopulation = getIncidentPopulation(selectedIncident);
  const isolationWindow = getIsolationWindow(selectedIncident);
  const signalScore = selectedIncident?.riskScore ?? 0;
  const rainfallSignal = Math.min(100, Math.max(32, signalScore - 2));
  const terrainSignal = Math.min(100, Math.max(38, signalScore + 5));
  const fieldSignal = Math.min(100, Math.max(28, signalScore - 10));
  const accessSignal = Math.min(100, Math.max(35, 100 - signalScore + 46));

  return (
    <div className="dashboard-page risk-page">
      <aside
        className={sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"}
      >
        <div className="sidebar-brand">
          <Link to="/">
            <img src="/brand/nerve-logo-clean.png" alt="NERVE" />
          </Link>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
          </button>
        </div>

        <nav>
          <Link to="/dashboard">
            <LayoutDashboard />
            Command overview
          </Link>

          <Link to="/dashboard/accessibility">
            <MapPinned />
            Accessibility map
          </Link>

          <Link to="/dashboard/risk-intelligence" className="active">
            <AlertTriangle />
            Risk intelligence
          </Link>

          <Link to="/dashboard/route-planning">
  <Route />
  Route planning
</Link>

          <Link to="/dashboard/deliveries">
  <Truck />
  Delivery operations
</Link>
<Link to="/dashboard/supply-priorities">
  <PackageCheck />
  Supply priorities
</Link>
      <Link to="/dashboard/approvals">
  <ShieldCheck />
  Approval centre
</Link>
<Link to="/dashboard/field-evidence">
  <Camera />
  Field evidence
</Link>
          <Link to="/dashboard/notifications">
  <Bell />
  Alert centre
</Link>
          <Link to="/dashboard/agents">
  <Bot />
  Agent activity
</Link>
        </nav>

        <div className="sidebar-agent">
          <span>
            <i />
            NERVE agents online
          </span>
          <small>Risk fusion is monitoring weather, terrain and field evidence.</small>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={() => void handleLogout()}
        >
          <LogOut />
          Sign out
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            type="button"
            className="dashboard-menu"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu />
          </button>

          <div>
            <span>{roleLabels[user.role]}</span>
            <b>East Khasi Hills Pilot</b>
          </div>

          <div className="dashboard-user">
            <Link
  to="/dashboard/notifications"
  className="notification-button"
  aria-label="Notifications"
>
  <Bell />
  <i />
</Link>

            <div className="user-avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <span>
              <b>{user.fullName}</b>
              <small>{user.email}</small>
            </span>
          </div>
        </header>

        <section className="risk-content">
          <header className="risk-titlebar">
            <div>
              <span className="dashboard-kicker">PREDICTIVE RISK OPERATIONS</span>
              <h1>Risk Intelligence Centre</h1>
              <p>Turn live evidence into an explainable, human-reviewed response.</p>
            </div>

            <div className={error ? "risk-live-state error" : "risk-live-state"}>
              {error ? <AlertTriangle /> : <Radio />}
              <span>
                <b>{error ? "Connection issue" : "Risk fusion active"}</b>
                <small>{error ?? "Weather · terrain · field · logistics"}</small>
              </span>
            </div>
          </header>

          <div className="risk-metrics" aria-label="Risk intelligence summary">
            <article className="critical">
              <span><AlertTriangle /></span>
              <div>
                <small>Critical incidents</small>
                <b>{metrics?.criticalIncidents ?? "—"}</b>
                <em>Require immediate attention</em>
              </div>
            </article>

            <article className="communities">
              <span><Users /></span>
              <div>
                <small>Communities exposed</small>
                <b>{metrics?.communitiesAtRisk ?? "—"}</b>
                <em>Inside current risk window</em>
              </div>
            </article>

            <article className="score">
              <span><Gauge /></span>
              <div>
                <small>Highest risk score</small>
                <b>{overview ? `${highestRisk}/100` : "—"}</b>
                <em>Live corridor assessment</em>
              </div>
            </article>

            <article className="approval">
              <span><ShieldCheck /></span>
              <div>
                <small>Pending approvals</small>
                <b>{metrics?.pendingApprovals ?? "—"}</b>
                <em>Human authority required</em>
              </div>
            </article>
          </div>

          <div className="risk-workspace">
            <section className="incident-queue">
              <header>
                <div>
                  <span>LIVE INCIDENT QUEUE</span>
                  <h2>Active threats</h2>
                </div>
                <b>{overview?.incidents.length ?? 0}</b>
              </header>

              <div className="severity-filters" aria-label="Filter by severity">
                {severityFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={severity === filter ? "active" : ""}
                    aria-pressed={severity === filter}
                    onClick={() => setSeverity(filter)}
                  >
                    {filter === "ALL" ? "All" : formatLabel(filter)}
                  </button>
                ))}
              </div>

              <div className="incident-queue-list">
                {filteredIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className={selectedIncident?.id === incident.id ? "selected" : ""}
                    onClick={() => setSelectedIncidentId(incident.id)}
                  >
                    <span className={`severity-pill ${getSeverityClass(incident.severity)}`}>
                      <AlertTriangle />
                      {formatLabel(incident.severity)}
                    </span>

                    <b>{incident.title}</b>

                    <span className="incident-location">
                      <MapPinned />
                      {incident.corridor?.name ?? incident.roadSegment?.name ?? "Regional watch"}
                    </span>

                    <footer>
                      <small>{incident.referenceNumber}</small>
                      <em>{incident.riskScore}/100</em>
                    </footer>
                  </button>
                ))}

                {!loading && filteredIncidents.length === 0 && (
                  <div className="risk-empty-state">
                    <CheckCircle2 />
                    <b>No {severity === "ALL" ? "active" : formatLabel(severity)} incidents</b>
                    <small>Select another severity to continue monitoring.</small>
                  </div>
                )}
              </div>
            </section>

            <section className="risk-evidence-panel">
              {selectedIncident ? (
                <>
                  <header className="evidence-heading">
                    <div>
                      <span className={`severity-pill ${getSeverityClass(selectedIncident.severity)}`}>
                        <AlertTriangle />
                        {formatLabel(selectedIncident.severity)} risk
                      </span>
                      <h2>{selectedIncident.title}</h2>
                      <p>
                        {selectedIncident.corridor?.name ?? "East Khasi Hills"}
                        {selectedIncident.roadSegment
                          ? ` · ${selectedIncident.roadSegment.name}`
                          : ""}
                      </p>
                    </div>

                    <span className="evidence-time">
                      <Clock3 />
                      <small>Detected</small>
                      <b>{formatTime(selectedIncident.detectedAt)}</b>
                    </span>
                  </header>

                  <div className="risk-signal-console">
                    <div className="risk-score-orbit">
                      <span className="orbit orbit-one" />
                      <span className="orbit orbit-two" />
                      <span className="orbit orbit-three" />
                      <div>
                        <small>COMBINED RISK</small>
                        <b>{selectedIncident.riskScore}</b>
                        <em>/100</em>
                      </div>
                    </div>

                    <div className="signal-matrix">
                      <div>
                        <span><CloudRain /> Rainfall pressure</span>
                        <b>{rainfallSignal}%</b>
                        <i><em style={{ width: `${rainfallSignal}%` }} /></i>
                      </div>
                      <div>
                        <span><Waves /> Terrain sensitivity</span>
                        <b>{terrainSignal}%</b>
                        <i><em style={{ width: `${terrainSignal}%` }} /></i>
                      </div>
                      <div>
                        <span><Satellite /> Field confidence</span>
                        <b>{fieldSignal}%</b>
                        <i><em style={{ width: `${fieldSignal}%` }} /></i>
                      </div>
                      <div>
                        <span><Navigation /> Access pressure</span>
                        <b>{accessSignal}%</b>
                        <i><em style={{ width: `${accessSignal}%` }} /></i>
                      </div>
                    </div>
                  </div>

                  <div className="evidence-source-row">
                    <article>
                      <CloudRain />
                      <span><small>Rain forecast</small><b>42 mm · next 6 hours</b></span>
                      <CheckCircle2 />
                    </article>
                    <article>
                      <Satellite />
                      <span><small>Terrain model</small><b>High slope saturation</b></span>
                      <CheckCircle2 />
                    </article>
                    <article>
                      <FileCheck2 />
                      <span><small>Field evidence</small><b>Verified reports linked</b></span>
                      <CheckCircle2 />
                    </article>
                  </div>

                  <div className="impact-grid">
                    <article className="community-impact-card">
                      <header>
                        <div>
                          <span>CONNECTIVITY IMPACT</span>
                          <h3>Communities in the isolation window</h3>
                        </div>
                        <Users />
                      </header>

                      <div className="impact-totals">
                        <span><b>{selectedIncident.communityImpacts.length}</b><small>communities</small></span>
                        <span><b>{affectedPopulation.toLocaleString("en-IN")}</b><small>people exposed</small></span>
                        <span><b>{isolationWindow || "—"}h</b><small>maximum isolation</small></span>
                      </div>

                      <div className="community-impact-list">
                        {selectedIncident.communityImpacts.map((impact) => (
                          <div key={impact.community.id}>
                            <span className="community-mark"><Crosshair /></span>
                            <span>
                              <b>{impact.community.name}</b>
                              <small>{formatLabel(impact.community.accessStatus)} access</small>
                            </span>
                            <em>{formatLabel(impact.impactLevel)}</em>
                          </div>
                        ))}

                        {selectedIncident.communityImpacts.length === 0 && (
                          <div className="no-community-impact">
                            <CheckCircle2 /> No community impact linked yet
                          </div>
                        )}
                      </div>
                    </article>

                    <article className="decision-trace-card">
                      <header>
                        <span>DECISION TRACE</span>
                        <h3>From signal to authority</h3>
                      </header>

                      <ol>
                        <li className="complete">
                          <span><CloudRain /></span>
                          <div><b>Evidence fused</b><small>Weather, terrain and field inputs</small></div>
                          <CheckCircle2 />
                        </li>
                        <li className="complete">
                          <span><Sparkles /></span>
                          <div><b>Impact assessed</b><small>Communities and services prioritised</small></div>
                          <CheckCircle2 />
                        </li>
                        <li className="current">
                          <span><ShieldCheck /></span>
                          <div><b>Human decision</b><small>{metrics?.pendingApprovals ?? 0} actions awaiting review</small></div>
                          <Radio />
                        </li>
                      </ol>
                    </article>
                  </div>
                </>
              ) : (
                <div className="risk-empty-detail">
                  <CheckCircle2 />
                  <h2>No incident selected</h2>
                  <p>Choose another severity or wait for a new operational signal.</p>
                </div>
              )}
            </section>

            <aside className="risk-agent-panel">
              <header>
                <div>
                  <span>AI DECISION CONTEXT</span>
                  <h2>Response guidance</h2>
                </div>
                <Bot />
              </header>

              <div className="agent-confidence">
                <span><Sparkles /></span>
                <div>
                  <small>AGENT CONSENSUS</small>
                  <b>{relatedRecommendations.length > 0 ? "Action ready" : "Monitoring"}</b>
                </div>
                <em>{relatedRecommendations.length > 0 ? "91%" : "—"}</em>
              </div>

              <div className="risk-recommendation-list">
                {relatedRecommendations.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                  />
                ))}

                {!loading && relatedRecommendations.length === 0 && (
                  <div className="risk-empty-state compact">
                    <CheckCircle2 />
                    <b>No action required</b>
                    <small>Agents will surface guidance when risk changes.</small>
                  </div>
                )}
              </div>

              <footer className="human-control-note">
                <ShieldCheck />
                <span>
                  <b>Human-supervised by design</b>
                  <small>Critical actions remain locked until verified approval.</small>
                </span>
              </footer>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
