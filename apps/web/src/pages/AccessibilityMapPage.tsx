import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  CloudRain,
  Layers3,
  LayoutDashboard,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Navigation,
  Radio,
  Route,
  Satellite,
  Truck,
  Users,
  X,
  ShieldCheck,
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
} from "../lib/operations";

import "./dashboard.css";

const roleLabels: Record<UserRole, string> = {
  GOVERNMENT_AUTHORITY: "Government Authority",
  LOGISTICS_OPERATOR: "Logistics Operator",
  FIELD_OFFICIAL: "Field Official",
  DRIVER: "Driver",
};

type LayerKey = "roads" | "risk" | "communities" | "deliveries";

type LayerState = Record<LayerKey, boolean>;

const defaultLayers: LayerState = {
  roads: true,
  risk: true,
  communities: true,
  deliveries: true,
};

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AccessibilityMapPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(getAuthenticatedUser());
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layers, setLayers] = useState<LayerState>(defaultLayers);
  const [severity, setSeverity] = useState("ALL");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMap(): Promise<void> {
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
            : "Live accessibility data could not be loaded.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMap();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const incidents = useMemo(() => {
    const allIncidents = overview?.incidents ?? [];

    if (severity === "ALL") return allIncidents;

    return allIncidents.filter(
      (incident) => incident.severity.toUpperCase() === severity,
    );
  }, [overview, severity]);

  const selectedIncident =
    incidents.find((incident) => incident.id === selectedIncidentId) ??
    incidents[0] ??
    null;

  const metrics = overview?.metrics;
  const primaryDelivery = overview?.deliveries[0];

  function toggleLayer(layer: LayerKey): void {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  if (loading && !user) {
    return (
      <div className="dashboard-loading">
        <Activity />
        <span>Loading accessibility intelligence...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-page accessibility-page">
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

          <Link to="/dashboard/accessibility" className="active">
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
          <small>Live access analysis is active for East Khasi Hills.</small>
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

        <section className="accessibility-content">
          <header className="accessibility-titlebar">
            <div>
              <span className="dashboard-kicker">LIVE NETWORK INTELLIGENCE</span>
              <h1>Accessibility map</h1>
              <p>See road risk, community isolation and essential movement in one view.</p>
            </div>

            <div className={error ? "map-connection error" : "map-connection"}>
              {error ? <AlertTriangle /> : <Radio />}
              <span>
                <b>{error ? "Connection issue" : "Live monitoring"}</b>
                <small>{error ?? "Operational database connected"}</small>
              </span>
            </div>
          </header>

          <div className="accessibility-summary" aria-label="Network summary">
            <article>
              <Navigation />
              <span>
                <small>Network accessible</small>
                <b>{metrics ? `${metrics.accessibleNetworkPercent}%` : "—"}</b>
              </span>
            </article>

            <article>
              <AlertTriangle />
              <span>
                <small>Critical corridors</small>
                <b>{metrics?.criticalCorridors ?? "—"}</b>
              </span>
            </article>

            <article>
              <Users />
              <span>
                <small>Communities at risk</small>
                <b>{metrics?.communitiesAtRisk ?? "—"}</b>
              </span>
            </article>

            <article>
              <Truck />
              <span>
                <small>Active deliveries</small>
                <b>{metrics?.activeDeliveries ?? "—"}</b>
              </span>
            </article>
          </div>

          <div className="accessibility-workspace">
            <section className="full-map-panel">
              <header>
                <div>
                  <span className="live-dot" />
                  <span>
                    <b>Shillong–Sohra corridor</b>
                    <small>East Khasi Hills, Meghalaya</small>
                  </span>
                </div>

                <label>
                  Severity
                  <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                    <option value="ALL">All levels</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </header>

              <div className="accessibility-map">
                <iframe
                  title="East Khasi Hills full accessibility map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=91.55%2C25.20%2C92.05%2C25.75&layer=mapnik&marker=25.5788%2C91.8933"
                  loading="eager"
                  tabIndex={-1}
                />

                <div className="accessibility-map-tone" />
                <div className="accessibility-map-scan" />

                {layers.roads && (
                  <svg className="accessibility-routes" viewBox="0 0 900 520" aria-hidden="true">
                    <path
                      className="accessibility-route-shadow"
                      d="M55 414 C172 362 245 380 340 288 S515 168 638 146 S785 117 858 82"
                    />
                    <path
                      className="accessibility-route-open"
                      d="M55 414 C172 362 245 380 340 288 S515 168 638 146"
                    />
                    <path
                      className="accessibility-route-risk"
                      d="M638 146 C715 130 785 117 858 82"
                    />
                    <path
                      className="accessibility-route-alternate"
                      d="M340 288 C405 430 622 438 758 310 S806 176 835 112"
                    />
                  </svg>
                )}

                {layers.risk && (
                  <>
                    <div className="full-risk-zone"><span /></div>
                    <div className="full-risk-card">
                      <AlertTriangle />
                      <span>
                        <small>{selectedIncident?.title ?? "Elevated landslide risk"}</small>
                        <b>{selectedIncident ? `${selectedIncident.riskScore} / 100` : "84 / 100"}</b>
                      </span>
                    </div>
                  </>
                )}

                {layers.communities && (
                  <>
                    <span className="community-marker shillong-community"><i />Shillong</span>
                    <span className="community-marker sohra-community"><i />Sohra</span>
                    <span className="community-marker mawmluh-community"><i />Mawmluh</span>
                  </>
                )}

                {layers.deliveries && (
                  <div className="full-map-vehicle" aria-label="Active essential delivery">
                    <Truck />
                  </div>
                )}

                <div className="weather-radar-card">
                  <CloudRain />
                  <span>
                    <small>RAINFALL FORECAST</small>
                    <b>42 mm · next 6 hours</b>
                  </span>
                </div>

                <div className="map-layer-control" aria-label="Map layers">
                  <span><Layers3 /> Map layers</span>

                  <button
                    type="button"
                    className={layers.roads ? "enabled" : ""}
                    aria-pressed={layers.roads}
                    onClick={() => toggleLayer("roads")}
                  >
                    <Route /> Road status
                  </button>

                  <button
                    type="button"
                    className={layers.risk ? "enabled" : ""}
                    aria-pressed={layers.risk}
                    onClick={() => toggleLayer("risk")}
                  >
                    <AlertTriangle /> Risk zones
                  </button>

                  <button
                    type="button"
                    className={layers.communities ? "enabled" : ""}
                    aria-pressed={layers.communities}
                    onClick={() => toggleLayer("communities")}
                  >
                    <MapPin /> Communities
                  </button>

                  <button
                    type="button"
                    className={layers.deliveries ? "enabled" : ""}
                    aria-pressed={layers.deliveries}
                    onClick={() => toggleLayer("deliveries")}
                  >
                    <Truck /> Deliveries
                  </button>
                </div>

                <div className="full-map-legend">
                  <span><i className="safe" />Accessible</span>
                  <span><i className="risk" />High risk</span>
                  <span><i className="alternate" />Safer route</span>
                </div>

                <span className="full-map-credit">© OpenStreetMap contributors</span>
              </div>

              <footer>
                <div>
                  <Satellite />
                  <span>
                    <small>Latest evidence</small>
                    <b>Rainfall + terrain + field reports</b>
                  </span>
                </div>

                <div>
                  <CheckCircle2 />
                  <span>
                    <small>Safer route</small>
                    <b>Mawphlang alternative ready</b>
                  </span>
                </div>

                <div>
                  <Activity />
                  <span>
                    <small>Last analysis</small>
                    <b>34 seconds ago</b>
                  </span>
                </div>
              </footer>
            </section>

            <aside className="map-inspector">
              <header>
                <div>
                  <span>LIVE INCIDENTS</span>
                  <h2>Corridor watch</h2>
                </div>
                <b>{incidents.length}</b>
              </header>

              <div className="incident-list">
                {incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <button
                      type="button"
                      key={incident.id}
                      className={selectedIncident?.id === incident.id ? "selected" : ""}
                      onClick={() => setSelectedIncidentId(incident.id)}
                    >
                      <span className="incident-severity">
                        <AlertTriangle />
                        {formatLabel(incident.severity)}
                      </span>
                      <b>{incident.title}</b>
                      <small>
                        {incident.corridor?.name ?? "East Khasi Hills corridor"}
                      </small>
                      <em>Risk score {incident.riskScore}/100</em>
                    </button>
                  ))
                ) : (
                  <div className="empty-incidents">
                    <CheckCircle2 />
                    <b>No incidents in this filter</b>
                    <small>Try selecting another severity level.</small>
                  </div>
                )}
              </div>

              <section className="isolation-card">
                <span>CONNECTIVITY IMPACT</span>
                <h3>{metrics?.communitiesAtRisk ?? 0} communities could lose access</h3>
                <p>
                  The primary corridor has limited redundancy during the current rainfall window.
                </p>
                <div>
                  <Users />
                  <span><b>3 villages</b><small>priority watch</small></span>
                </div>
                <div>
                  <Navigation />
                  <span><b>1 safer route</b><small>available now</small></span>
                </div>
              </section>

              <section className="delivery-watch">
                <span>
                  <Truck />
                  <b>Essential movement</b>
                </span>
                <p>{primaryDelivery?.cargoDescription ?? "Medical delivery awaiting route confirmation"}</p>
                <small>
                  {primaryDelivery
                    ? `${primaryDelivery.referenceNumber} · ${formatLabel(primaryDelivery.status)}`
                    : "No active delivery data"}
                </small>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
