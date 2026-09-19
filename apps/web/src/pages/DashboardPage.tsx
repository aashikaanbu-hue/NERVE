import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Navigation,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
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
  type OverviewRecommendation,
} from "../lib/operations";

import "./dashboard.css";

type WorkspaceDetails = {
  label: string;
  heading: string;
  description: string;
};

const workspaceDetails: Record<UserRole, WorkspaceDetails> = {
  GOVERNMENT_AUTHORITY: {
    label: "Government Authority",
    heading: "Regional Command Centre",
    description:
      "Review risk evidence, approve coordinated actions and protect community access.",
  },
  LOGISTICS_OPERATOR: {
    label: "Logistics Operator",
    heading: "Logistics Operations Centre",
    description:
      "Coordinate essential deliveries, fleets and safer routes across active corridors.",
  },
  FIELD_OFFICIAL: {
    label: "Field Official",
    heading: "Field Intelligence Workspace",
    description:
      "Verify road conditions, submit ground evidence and monitor assigned incidents.",
  },
  DRIVER: {
    label: "Driver",
    heading: "Safe Journey Workspace",
    description:
      "Follow approved routes, receive live alerts and report travel conditions.",
  },
};

function formatText(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getAgentName(agentType: string): string {
  const formatted = formatText(agentType).replace(/^Nerve /, "");
  return `NERVE ${formatted}`;
}

function getRecommendationClass(
  recommendation: OverviewRecommendation,
): "critical" | "route" | "impact" {
  const priority = recommendation.priority.toUpperCase();
  const category = `${recommendation.agentType} ${recommendation.type}`.toUpperCase();

  if (priority === "CRITICAL" || priority === "HIGH") {
    return "critical";
  }

  if (category.includes("ROUTE")) {
    return "route";
  }

  return "impact";
}

function RecommendationIcon({
  cardClass,
}: {
  cardClass: "critical" | "route" | "impact";
}) {
  if (cardClass === "critical") {
    return <AlertTriangle />;
  }

  if (cardClass === "route") {
    return <Navigation />;
  }

  return <Users />;
}

export function DashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(
    getAuthenticatedUser(),
  );
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationsError, setOperationsError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        try {
          const operationsData = await getOperationsOverview();

          if (mounted) {
            setOverview(operationsData);
            setOperationsError(null);
          }
        } catch (error) {
          if (mounted) {
            setOperationsError(
              error instanceof Error
                ? error.message
                : "Operational data could not be loaded.",
            );
          }
        }
      } catch {
        if (mounted) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  if (loading && !user) {
    return (
      <div className="dashboard-loading">
        <Activity />
        <span>Loading secure workspace...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const workspace = workspaceDetails[user.role];
  const metrics = overview?.metrics;
  const recommendations = overview?.recommendations ?? [];
  const primaryIncident = overview?.incidents[0];

  return (
    <div className="dashboard-page">
      <aside
        className={
          sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"
        }
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
          <Link to="/dashboard" className="active">
            <LayoutDashboard />
            Command overview
          </Link>

          <Link to="/dashboard/accessibility">
            <MapPinned />
            Accessibility map
          </Link>

          <Link to="/dashboard/risk-intelligence">
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
<Link to="/dashboard/approvals">
  <ShieldCheck />
  Approval centre
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
          <small>
            Four specialised agents are monitoring the pilot region.
          </small>
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
            <span>{workspace.label}</span>
            <b>East Khasi Hills Pilot</b>
          </div>

          <div className="dashboard-user">
            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
            >
              <Bell />
              <i />
            </button>

            <div className="user-avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <span>
              <b>{user.fullName}</b>
              <small>{user.email}</small>
            </span>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <div>
              <span className="dashboard-kicker">
                LIVE OPERATIONAL PICTURE
              </span>
              <h1>{workspace.heading}</h1>
              <p>{workspace.description}</p>
            </div>

            <div className="last-updated">
              {operationsError ? <AlertTriangle /> : <Radio />}
              <span>
                <b>{operationsError ? "Data connection issue" : "Live monitoring"}</b>
                <small>
                  {operationsError
                    ? operationsError
                    : overview
                      ? "Connected to operational database"
                      : "Loading operational data..."}
                </small>
              </span>
            </div>
          </div>

          <div className="dashboard-metrics">
            <article>
              <div className="metric-icon green">
                <Navigation />
              </div>
              <span>
                <small>Accessible network</small>
                <b>
                  {metrics ? `${metrics.accessibleNetworkPercent}%` : "—"}
                </b>
                <em>
                  {metrics
                    ? `${metrics.accessibleSegments} of ${metrics.totalSegments} segments accessible`
                    : "Loading network data"}
                </em>
              </span>
            </article>

            <article>
              <div className="metric-icon blue">
                <Truck />
              </div>
              <span>
                <small>Active deliveries</small>
                <b>{metrics?.activeDeliveries ?? "—"}</b>
                <em>Essential deliveries in progress</em>
              </span>
            </article>

            <article>
              <div className="metric-icon orange">
                <AlertTriangle />
              </div>
              <span>
                <small>Critical corridors</small>
                <b>{metrics?.criticalCorridors ?? "—"}</b>
                <em>
                  {metrics
                    ? `${metrics.pendingApprovals} need approval`
                    : "Loading approval data"}
                </em>
              </span>
            </article>

            <article>
              <div className="metric-icon purple">
                <Users />
              </div>
              <span>
                <small>Communities at risk</small>
                <b>{metrics?.communitiesAtRisk ?? "—"}</b>
                <em>Current live risk exposure</em>
              </span>
            </article>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-map-card">
              <header>
                <div>
                  <span className="live-dot" />
                  <span>
                    <b>Regional accessibility</b>
                    <small>
                      {primaryIncident?.corridor?.name ??
                        "East Khasi Hills, Meghalaya"}
                    </small>
                  </span>
                </div>

                <Link to="/dashboard/accessibility">
                  Open full map
                  <ChevronRight />
                </Link>
              </header>

              <div className="dashboard-map">
                <iframe
                  title="East Khasi Hills operational map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=91.55%2C25.20%2C92.05%2C25.75&layer=mapnik&marker=25.5788%2C91.8933"
                  loading="eager"
                  tabIndex={-1}
                />

                <div className="dashboard-map-tone" />
                <div className="dashboard-map-scan" />

                <svg viewBox="0 0 720 360" aria-hidden="true">
                  <path
                    className="dashboard-road-base"
                    d="M48 302 C142 266 192 278 274 218 S414 122 516 112 S632 92 700 64"
                  />
                  <path
                    className="dashboard-road-safe"
                    d="M48 302 C142 266 192 278 274 218 S414 122 516 112"
                  />
                  <path
                    className="dashboard-road-risk"
                    d="M516 112 C584 106 632 92 700 64"
                  />
                  <path
                    className="dashboard-alternate"
                    d="M274 218 C332 326 490 330 602 236 S646 138 680 92"
                  />
                </svg>

                <div className="dashboard-risk-pulse" aria-hidden="true">
                  <span />
                </div>

                <div className="map-weather">
                  <CloudRain />
                  <span>
                    <b>Heavy rain</b>
                    <small>42 mm forecast</small>
                  </span>
                </div>

                <div className="map-risk">
                  <AlertTriangle />
                  <span>
                    <small>{primaryIncident?.title ?? "Critical road risk"}</small>
                    <b>{primaryIncident ? `${primaryIncident.riskScore} / 100` : "—"}</b>
                  </span>
                </div>

                <div className="map-vehicle">
                  <Truck />
                </div>

                <span className="map-location shillong-location">
                  <i />
                  Shillong
                </span>

                <span className="map-location sohra-location">
                  <i />
                  Sohra
                </span>

                <div className="dashboard-map-legend">
                  <span>
                    <i className="safe" />
                    Accessible
                  </span>
                  <span>
                    <i className="risk" />
                    Critical
                  </span>
                  <span>
                    <i className="alternate" />
                    Safer alternative
                  </span>
                </div>

                <span className="dashboard-map-credit">
                  © OpenStreetMap contributors
                </span>
              </div>
            </section>

            <section className="agent-panel">
              <header>
                <div>
                  <span>AI RECOMMENDATIONS</span>
                  <h2>Agent decision queue</h2>
                </div>
                <Bot />
              </header>

              {recommendations.length > 0 ? (
                recommendations.slice(0, 3).map((recommendation) => {
                  const cardClass = getRecommendationClass(recommendation);

                  return (
                    <article
                      key={recommendation.id}
                      className={`recommendation ${cardClass}`}
                    >
                      <div>
                        <RecommendationIcon cardClass={cardClass} />
                      </div>
                      <span>
                        <small>
                          {getAgentName(recommendation.agentType)} ·{" "}
                          {formatText(recommendation.priority)}
                        </small>
                        <b>{recommendation.title}</b>
                        <p>{recommendation.reasoning}</p>
                      </span>
                    </article>
                  );
                })
              ) : (
                <article className="recommendation route">
                  <div>
                    <CheckCircle2 />
                  </div>
                  <span>
                    <small>NERVE Command · Ready</small>
                    <b>No pending recommendations</b>
                    <p>The agent decision queue is currently clear.</p>
                  </span>
                </article>
              )}

              <Link
  to="/dashboard/approvals"
  className="review-queue"
>
  Review decision queue ({recommendations.length})
  <ChevronRight />
</Link>
            </section>
          </div>

          <section className="agent-status-section">
            <div className="section-heading">
              <div>
                <span>AGENTIC AI ACTIVITY</span>
                <h2>Coordinated intelligence</h2>
              </div>
              <button type="button">
                View audit trail
                <ChevronRight />
              </button>
            </div>

            <div className="dashboard-agent-grid">
              <article>
                <Gauge />
                <span>
                  <b>NERVE Sense</b>
                  <small>
                    {metrics
                      ? `Analysing ${metrics.criticalIncidents} critical incident`
                      : "Analysing live signals"}
                  </small>
                </span>
                <CheckCircle2 />
              </article>

              <article>
                <Users />
                <span>
                  <b>NERVE Impact</b>
                  <small>
                    {metrics
                      ? `Monitoring ${metrics.communitiesAtRisk} communities`
                      : "Loading community impact"}
                  </small>
                </span>
                <CheckCircle2 />
              </article>

              <article>
                <Navigation />
                <span>
                  <b>NERVE Route</b>
                  <small>
                    {metrics
                      ? `Supporting ${metrics.activeDeliveries} active delivery`
                      : "Preparing safer routes"}
                  </small>
                </span>
                <CheckCircle2 />
              </article>

              <article>
                <ShieldCheck />
                <span>
                  <b>NERVE Command</b>
                  <small>
                    {metrics
                      ? `${metrics.pendingApprovals} recommendations awaiting approval`
                      : "Loading approval queue"}
                  </small>
                </span>
                <Activity />
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
