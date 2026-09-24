import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Compass,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Navigation,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  TrafficCone,
  Truck,
  Users,
  X,
  Zap,
  PackageCheck,
  Camera,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

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
  type OverviewDelivery,
} from "../lib/operations";

import "./dashboard.css";
import "./route-planning.css";

type RouteOption = {
  id: "safer" | "direct" | "backup";
  label: string;
  subtitle: string;
  etaMinutes: number;
  distanceKm: number;
  riskScore: number;

  status:
    | "RECOMMENDED"
    | "RESTRICTED"
    | "AVAILABLE";

  timeNote: string;
  rationale: string;
};

type MapLayer =
  | "risk"
  | "communities"
  | "fleet";

const roleLabels: Record<UserRole, string> = {
  GOVERNMENT_AUTHORITY:
    "Government Authority",

  LOGISTICS_OPERATOR:
    "Logistics Operator",

  FIELD_OFFICIAL:
    "Field Official",

  DRIVER:
    "Driver",
};

function formatLabel(
  value: string,
): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function createRouteOptions(
  delivery: OverviewDelivery | null,
): RouteOption[] {
  const corridorRisk =
    delivery?.corridor?.riskScore ?? 84;

  return [
    {
      id: "safer",
      label: "Mawphlang diversion",
      subtitle:
        "Protected essential corridor",
      etaMinutes: 52,
      distanceKm: 61.4,

      riskScore:
        Math.max(
          18,
          corridorRisk - 60,
        ),

      status: "RECOMMENDED",

      timeNote:
        "18 min saved against contingency plan",

      rationale:
        "Avoids the high-saturation Sohra approach while preserving access to priority communities.",
    },
    {
      id: "direct",
      label: "Shillong–Sohra direct",
      subtitle: "Primary corridor",
      etaMinutes: 34,
      distanceKm: 51.2,
      riskScore: corridorRisk,
      status: "RESTRICTED",

      timeNote:
        "Fastest in normal conditions",

      rationale:
        "A critical landslide signal intersects this route. Essential movement is not recommended.",
    },
    {
      id: "backup",
      label: "Pynursla relief link",
      subtitle:
        "Secondary contingency",
      etaMinutes: 69,
      distanceKm: 73.8,

      riskScore:
        Math.max(
          30,
          corridorRisk - 46,
        ),

      status: "AVAILABLE",

      timeNote:
        "17 min slower than recommended",

      rationale:
        "Lower exposure than the primary corridor, with a longer response and refuelling window.",
    },
  ];
}

function routeStatusClass(
  status: RouteOption["status"],
): string {
  return status.toLowerCase();
}

export function RoutePlanningPage() {
  const navigate = useNavigate();

  const [
    user,
    setUser,
  ] = useState<AuthUser | null>(
    getAuthenticatedUser(),
  );

  const [
    overview,
    setOverview,
  ] =
    useState<OperationsOverview | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    selectedDeliveryId,
    setSelectedDeliveryId,
  ] =
    useState<string | null>(null);

  const [
    selectedRouteId,
    setSelectedRouteId,
  ] =
    useState<RouteOption["id"]>(
      "safer",
    );

  const [
    planApplied,
    setPlanApplied,
  ] = useState(false);

  const [
    recalculating,
    setRecalculating,
  ] = useState(false);

  const [
    layers,
    setLayers,
  ] = useState<
    Record<MapLayer, boolean>
  >({
    risk: true,
    communities: true,
    fleet: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadRoutePlanning():
      Promise<void> {
      try {
        const currentUser =
          await getCurrentUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        const operationalData =
          await getOperationsOverview();

        if (!mounted) {
          return;
        }

        setOverview(
          operationalData,
        );

        setSelectedDeliveryId(
          operationalData
            .deliveries[0]
            ?.id ?? null,
        );

        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (
          !getAuthenticatedUser()
        ) {
          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Route intelligence could not be loaded.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadRoutePlanning();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const selectedDelivery =
    useMemo(
      () =>
        overview?.deliveries.find(
          (delivery) =>
            delivery.id ===
            selectedDeliveryId,
        ) ??
        overview?.deliveries[0] ??
        null,

      [
        overview,
        selectedDeliveryId,
      ],
    );

  const routeOptions =
    useMemo(
      () =>
        createRouteOptions(
          selectedDelivery,
        ),
      [selectedDelivery],
    );

  const selectedRoute =
    routeOptions.find(
      (route) =>
        route.id ===
        selectedRouteId,
    ) ?? routeOptions[0];

  async function handleLogout():
    Promise<void> {
    await logout();

    navigate(
      "/login",
      {
        replace: true,
      },
    );
  }

  function toggleLayer(
    layer: MapLayer,
  ): void {
    setLayers(
      (current) => ({
        ...current,
        [layer]:
          !current[layer],
      }),
    );
  }

  function recalculateRoutes():
    void {
    setRecalculating(true);
    setPlanApplied(false);

    window.setTimeout(
      () => {
        setSelectedRouteId(
          "safer",
        );

        setRecalculating(false);
      },
      650,
    );
  }

  if (
    loading &&
    !user
  ) {
    return (
      <div className="dashboard-loading">
        <Activity />

        <span>
          Loading route
          intelligence...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const origin =
    selectedDelivery?.originName ??
    "Shillong Regional Store";

  const destination =
    selectedDelivery
      ?.destinationCommunity
      .name ?? "Sohra";

  const cargo =
    selectedDelivery
      ? formatLabel(
          selectedDelivery
            .cargoType,
        )
      : "Essential medical supplies";

  return (
    <div className="dashboard-page route-page">
      <aside
        className={
          sidebarOpen
            ? "dashboard-sidebar open"
            : "dashboard-sidebar"
        }
      >
        <div className="sidebar-brand">
          <Link to="/">
            <img
              src="/brand/nerve-logo-clean.png"
              alt="NERVE"
            />
          </Link>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() =>
              setSidebarOpen(false)
            }
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

          <Link to="/dashboard/risk-intelligence">
            <AlertTriangle />

            Risk intelligence
          </Link>

          <Link
            to="/dashboard/route-planning"
            className="active"
          >
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
<Link to="/dashboard/notifications">
  <Bell />
  Alert centre
</Link>
<Link to="/dashboard/field-evidence">
  <Camera />
  Field evidence
</Link>
<Link to="/dashboard/agents">
  <Bot />
  Agent activity
</Link>
        </nav>

        <div className="sidebar-agent">
          <span>
            <i />

            NERVE Route online
          </span>

          <small>
            Safe alternatives are
            recalculated against
            current access risk.
          </small>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={() =>
            void handleLogout()
          }
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
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu />
          </button>

          <div>
            <span>
              {
                roleLabels[
                  user.role
                ]
              }
            </span>

            <b>
              East Khasi Hills Pilot
            </b>
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
              {user.fullName
                .charAt(0)
                .toUpperCase()}
            </div>

            <span>
              <b>
                {user.fullName}
              </b>

              <small>
                {user.email}
              </small>
            </span>
          </div>
        </header>

        <section className="route-content">
          <header className="route-titlebar">
            <div>
              <span className="dashboard-kicker">
                SAFE MOVEMENT
                INTELLIGENCE
              </span>

              <h1>
                Route Planning Centre
              </h1>

              <p>
                Compare current risk,
                protect essential cargo
                and choose a safer
                corridor.
              </p>
            </div>

            <div
              className={
                error
                  ? "route-live-state error"
                  : "route-live-state"
              }
            >
              {error ? (
                <AlertTriangle />
              ) : (
                <Radio />
              )}

              <span>
                <b>
                  {error
                    ? "Connection issue"
                    : "NERVE Route online"}
                </b>

                <small>
                  {error ??
                    "Alternatives refreshed from live evidence"}
                </small>
              </span>
            </div>
          </header>

          <section
            className="route-query-panel"
            aria-label="Route request"
          >
            <label className="delivery-selector">
              <span>
                Active movement
              </span>

              <select
                value={
                  selectedDelivery?.id ??
                  ""
                }
                disabled={
                  (overview
                    ?.deliveries
                    .length ?? 0) === 0
                }
                onChange={(
                  event,
                ) => {
                  setSelectedDeliveryId(
                    event.target
                      .value,
                  );

                  setSelectedRouteId(
                    "safer",
                  );

                  setPlanApplied(
                    false,
                  );
                }}
              >
                {(
                  overview?.deliveries ??
                  []
                ).map(
                  (delivery) => (
                    <option
                      key={
                        delivery.id
                      }
                      value={
                        delivery.id
                      }
                    >
                      {
                        delivery.referenceNumber
                      }{" "}
                      ·{" "}
                      {formatLabel(
                        delivery.cargoType,
                      )}
                    </option>
                  ),
                )}

                {(overview
                  ?.deliveries
                  .length ?? 0) ===
                  0 && (
                  <option value="">
                    No active delivery
                  </option>
                )}
              </select>
            </label>

            <div className="route-query-point origin">
              <span>
                <MapPin />
              </span>

              <div>
                <small>
                  ORIGIN
                </small>

                <b>
                  {origin}
                </b>
              </div>
            </div>

            <span className="route-query-line">
              <i />

              <Navigation />
            </span>

            <div className="route-query-point destination">
              <span>
                <MapPinned />
              </span>

              <div>
                <small>
                  DESTINATION
                </small>

                <b>
                  {destination}
                </b>
              </div>
            </div>

            <button
              type="button"
              className="recalculate-button"
              disabled={
                recalculating
              }
              onClick={
                recalculateRoutes
              }
            >
              {recalculating ? (
                <Activity />
              ) : (
                <Sparkles />
              )}

              {recalculating
                ? "Recalculating..."
                : "Recalculate routes"}
            </button>
          </section>

          <div
            className="route-metrics"
            aria-label="Recommended route summary"
          >
            <article>
              <span>
                <Clock3 />
              </span>

              <div>
                <small>
                  Estimated arrival
                </small>

                <b>
                  {
                    selectedRoute.etaMinutes
                  }{" "}
                  min
                </b>

                <em>
                  {
                    selectedRoute.timeNote
                  }
                </em>
              </div>
            </article>

            <article>
              <span>
                <Navigation />
              </span>

              <div>
                <small>
                  Route distance
                </small>

                <b>
                  {
                    selectedRoute.distanceKm
                  }{" "}
                  km
                </b>

                <em>
                  Live corridor
                  calculation
                </em>
              </div>
            </article>

            <article>
              <span>
                <Gauge />
              </span>

              <div>
                <small>
                  Exposure score
                </small>

                <b>
                  {
                    selectedRoute.riskScore
                  }
                  /100
                </b>

                <em>
                  {selectedRoute.status ===
                  "RESTRICTED"
                    ? "Critical exposure"
                    : "Within movement threshold"}
                </em>
              </div>
            </article>

            <article>
              <span>
                <Truck />
              </span>

              <div>
                <small>
                  Essential cargo
                </small>

                <b>
                  {cargo}
                </b>

                <em>
                  {selectedDelivery
                    ?.referenceNumber ??
                    "Planning mode"}
                </em>
              </div>
            </article>
          </div>

          <div className="route-workspace">
            <section className="route-map-panel">
              <header>
                <div>
                  <span className="route-map-live">
                    <i />
                  </span>

                  <span>
                    <b>
                      Live route
                      intelligence
                    </b>

                    <small>
                      Shillong–Sohra
                      operational
                      corridor
                    </small>
                  </span>
                </div>

                <span className="route-map-confidence">
                  <Sparkles />

                  91% confidence
                </span>
              </header>

              <div
                className={`route-map active-${selectedRoute.id}`}
              >
                <iframe
                  title="East Khasi Hills safe route planning map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=91.58%2C25.18%2C92.02%2C25.67&layer=mapnik"
                  loading="lazy"
                  tabIndex={-1}
                />

                <div
                  className="route-map-tone"
                  aria-hidden="true"
                />

                <div
                  className="route-map-grid"
                  aria-hidden="true"
                />

                <svg
                  className="route-map-lines"
                  viewBox="0 0 900 570"
                  role="img"
                  aria-label="Primary, safer and backup routes"
                >
                  <path
                    className="route-base"
                    d="M112 468 C195 420 248 392 325 344 C399 299 458 253 530 224 C609 191 676 166 786 108"
                  />

                  <path
                    className="route-path direct-path"
                    d="M112 468 C195 420 248 392 325 344 C399 299 458 253 530 224 C609 191 676 166 786 108"
                  />

                  <path
                    className="route-path safer-path"
                    d="M112 468 C198 446 270 439 337 400 C407 359 425 306 489 282 C566 253 661 287 720 230 C758 193 773 145 786 108"
                  />

                  <path
                    className="route-path backup-path"
                    d="M112 468 C170 511 258 520 337 488 C410 458 472 408 554 395 C643 381 722 332 766 260 C789 221 798 159 786 108"
                  />
                </svg>

                {layers.risk && (
                  <>
                    <span
                      className="route-risk-zone"
                      aria-hidden="true"
                    >
                      <i />
                    </span>

                    <div className="route-risk-alert">
                      <AlertTriangle />

                      <span>
                        <small>
                          CRITICAL SECTION
                        </small>

                        <b>
                          Sohra approach
                          · 84/100
                        </b>
                      </span>
                    </div>
                  </>
                )}

                {layers.communities && (
                  <>
                    <span className="route-place route-place-origin">
                      <i />

                      Shillong
                    </span>

                    <span className="route-place route-place-mawphlang">
                      <i />

                      Mawphlang
                    </span>

                    <span className="route-place route-place-destination">
                      <i />

                      Sohra
                    </span>
                  </>
                )}

                {layers.fleet && (
                  <div className="route-vehicle">
                    <Truck />

                    <span>
                      {selectedDelivery
                        ?.referenceNumber ??
                        "MED-204"}
                    </span>
                  </div>
                )}

                <div className="route-weather-card">
                  <CloudRain />

                  <span>
                    <small>
                      WEATHER WINDOW
                    </small>

                    <b>
                      42 mm · next 6
                      hours
                    </b>
                  </span>
                </div>

                <div className="route-layer-controls">
                  <span>
                    <Compass />

                    Map layers
                  </span>

                  <button
                    type="button"
                    className={
                      layers.risk
                        ? "enabled"
                        : ""
                    }
                    onClick={() =>
                      toggleLayer(
                        "risk",
                      )
                    }
                  >
                    <AlertTriangle />

                    Risk zones
                  </button>

                  <button
                    type="button"
                    className={
                      layers.communities
                        ? "enabled"
                        : ""
                    }
                    onClick={() =>
                      toggleLayer(
                        "communities",
                      )
                    }
                  >
                    <Users />

                    Communities
                  </button>

                  <button
                    type="button"
                    className={
                      layers.fleet
                        ? "enabled"
                        : ""
                    }
                    onClick={() =>
                      toggleLayer(
                        "fleet",
                      )
                    }
                  >
                    <Truck />

                    Active fleet
                  </button>
                </div>

                <div className="route-map-legend">
                  <span>
                    <i className="safe" />

                    Recommended
                  </span>

                  <span>
                    <i className="risk" />

                    Restricted
                  </span>

                  <span>
                    <i className="backup" />

                    Backup
                  </span>
                </div>

                <span className="route-map-credit">
                  © OpenStreetMap
                  contributors
                </span>
              </div>

              <footer>
                <span>
                  <Zap />

                  <div>
                    <small>
                      Route engine
                    </small>

                    <b>
                      3 alternatives
                      evaluated
                    </b>
                  </div>
                </span>

                <span>
                  <ShieldCheck />

                  <div>
                    <small>
                      Safety policy
                    </small>

                    <b>
                      Critical section
                      avoided
                    </b>
                  </div>
                </span>

                <span>
                  <Radio />

                  <div>
                    <small>
                      Last analysis
                    </small>

                    <b>
                      34 seconds ago
                    </b>
                  </div>
                </span>
              </footer>
            </section>

            <aside className="route-decision-panel">
              <header>
                <div>
                  <span>
                    ROUTE COMPARISON
                  </span>

                  <h2>
                    Choose movement
                    plan
                  </h2>
                </div>

                <Route />
              </header>

              <div className="route-options">
                {routeOptions.map(
                  (option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        selectedRoute.id ===
                        option.id
                          ? `selected ${option.id}`
                          : option.id
                      }
                      onClick={() => {
                        setSelectedRouteId(
                          option.id,
                        );

                        setPlanApplied(
                          false,
                        );
                      }}
                    >
                      <header>
                        <span
                          className={`route-option-status ${routeStatusClass(
                            option.status,
                          )}`}
                        >
                          {option.status ===
                          "RECOMMENDED" ? (
                            <CheckCircle2 />
                          ) : option.status ===
                            "RESTRICTED" ? (
                            <AlertTriangle />
                          ) : (
                            <Navigation />
                          )}

                          {formatLabel(
                            option.status,
                          )}
                        </span>

                        <em>
                          {
                            option.riskScore
                          }
                          /100 risk
                        </em>
                      </header>

                      <b>
                        {option.label}
                      </b>

                      <small>
                        {
                          option.subtitle
                        }
                      </small>

                      <div>
                        <span>
                          <Clock3 />

                          {
                            option.etaMinutes
                          }{" "}
                          min
                        </span>

                        <span>
                          <Navigation />

                          {
                            option.distanceKm
                          }{" "}
                          km
                        </span>
                      </div>
                    </button>
                  ),
                )}
              </div>

              <section
                className={`route-verdict ${selectedRoute.id}`}
              >
                <span>
                  <Bot />
                </span>

                <div>
                  <small>
                    NERVE ROUTE VERDICT
                  </small>

                  <h3>
                    {selectedRoute.status ===
                    "RESTRICTED"
                      ? "Movement not advised"
                      : "Movement path available"}
                  </h3>

                  <p>
                    {
                      selectedRoute.rationale
                    }
                  </p>
                </div>
              </section>

              <div className="route-plan-impact">
                <span>
                  <Users />

                  <b>
                    3 communities
                  </b>

                  <small>
                    protected by
                    selected plan
                  </small>
                </span>

                <span>
                  <TrafficCone />

                  <b>
                    1 critical section
                  </b>

                  <small>
                    removed from
                    movement
                  </small>
                </span>
              </div>

              <button
                type="button"
                className={
                  planApplied
                    ? "apply-route applied"
                    : "apply-route"
                }
                disabled={
                  selectedRoute.status ===
                  "RESTRICTED"
                }
                onClick={() =>
                  setPlanApplied(true)
                }
              >
                {planApplied ? (
                  <CheckCircle2 />
                ) : (
                  <ShieldCheck />
                )}

                {selectedRoute.status ===
                "RESTRICTED"
                  ? "Restricted route cannot be selected"
                  : planApplied
                    ? "Movement plan selected"
                    : "Select this movement plan"}

                {!planApplied &&
                  selectedRoute.status !==
                    "RESTRICTED" && (
                    <ChevronRight />
                  )}
              </button>

              <footer className="route-human-note">
                <ShieldCheck />

                <span>
                  <b>
                    Human-controlled
                    routing
                  </b>

                  <small>
                    Selection prepares
                    the plan; dispatch
                    remains
                    authority-approved.
                  </small>
                </span>
              </footer>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}