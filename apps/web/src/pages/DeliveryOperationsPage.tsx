import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Box,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  LayoutDashboard,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  PackageCheck,
  Phone,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
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
import "./delivery-operations.css";

type DeliveryFilter =
  | "ALL"
  | "HIGH_PRIORITY"
  | "IN_TRANSIT";

const roleLabels: Record<
  UserRole,
  string
> = {
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

function formatTime(
  value: string | null,
): string {
  if (!value) {
    return "Awaiting schedule";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Awaiting schedule";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function deliveryProgress(
  status: string,
): number {
  switch (
    status.toUpperCase()
  ) {
    case "DELIVERED":
    case "COMPLETED":
      return 100;

    case "IN_TRANSIT":
      return 68;

    case "ASSIGNED":
    case "DISPATCHED":
      return 36;

    case "DELAYED":
      return 52;

    default:
      return 18;
  }
}

function isHighPriority(
  delivery: OverviewDelivery,
): boolean {
  const priority =
    delivery.priority.toUpperCase();

  return (
    priority === "HIGH" ||
    priority === "CRITICAL"
  );
}

export function DeliveryOperationsPage() {
  const navigate =
    useNavigate();

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
    filter,
    setFilter,
  ] =
    useState<DeliveryFilter>(
      "ALL",
    );

  const [
    dispatchConfirmed,
    setDispatchConfirmed,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOperations():
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
            : "Delivery operations could not be loaded.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadOperations();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const deliveries =
    overview?.deliveries ?? [];

  const filteredDeliveries =
    useMemo(() => {
      if (
        filter ===
        "HIGH_PRIORITY"
      ) {
        return deliveries.filter(
          isHighPriority,
        );
      }

      if (
        filter ===
        "IN_TRANSIT"
      ) {
        return deliveries.filter(
          (delivery) =>
            [
              "IN_TRANSIT",
              "DISPATCHED",
              "ASSIGNED",
            ].includes(
              delivery.status.toUpperCase(),
            ),
        );
      }

      return deliveries;
    }, [deliveries, filter]);

  const selectedDelivery =
    deliveries.find(
      (delivery) =>
        delivery.id ===
        selectedDeliveryId,
    ) ??
    filteredDeliveries[0] ??
    deliveries[0] ??
    null;

  const progress =
    selectedDelivery
      ? deliveryProgress(
          selectedDelivery.status,
        )
      : 0;

  const highPriorityCount =
    deliveries.filter(
      isHighPriority,
    ).length;

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

  function selectDelivery(
    deliveryId: string,
  ): void {
    setSelectedDeliveryId(
      deliveryId,
    );

    setDispatchConfirmed(false);
  }

  if (
    loading &&
    !user
  ) {
    return (
      <div className="dashboard-loading">
        <Activity />

        <span>
          Loading delivery
          operations...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-page delivery-page">
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

          <Link to="/dashboard/route-planning">
            <Route />

            Route planning
          </Link>

          <Link
            to="/dashboard/deliveries"
            className="active"
          >
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
          <Link to="/dashboard/agents">
  <Bot />
  Agent activity
</Link>
        </nav>

        <div className="sidebar-agent">
          <span>
            <i />

            NERVE logistics online
          </span>

          <small>
            Essential movements are
            monitored against live
            corridor risk.
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

        <section className="delivery-content">
          <header className="delivery-titlebar">
            <div>
              <span className="dashboard-kicker">
                ESSENTIAL MOVEMENT
                CONTROL
              </span>

              <h1>
                Delivery Operations
                Centre
              </h1>

              <p>
                Protect critical cargo,
                coordinate drivers and
                keep every movement
                inside a verified
                access window.
              </p>
            </div>

            <div
              className={
                error
                  ? "delivery-live-state error"
                  : "delivery-live-state"
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
                    : "Live fleet monitoring"}
                </b>

                <small>
                  {error ??
                    "Operational database connected"}
                </small>
              </span>
            </div>
          </header>

          <section
            className="delivery-metrics"
            aria-label="Delivery overview"
          >
            <article>
              <span>
                <Truck />
              </span>

              <div>
                <small>
                  Active movements
                </small>

                <b>
                  {deliveries.length}
                </b>

                <em>
                  Essential deliveries
                  tracked
                </em>
              </div>
            </article>

            <article>
              <span>
                <AlertTriangle />
              </span>

              <div>
                <small>
                  High priority
                </small>

                <b>
                  {highPriorityCount}
                </b>

                <em>
                  Require continuous
                  monitoring
                </em>
              </div>
            </article>

            <article>
              <span>
                <ShieldCheck />
              </span>

              <div>
                <small>
                  Protected route
                </small>

                <b>
                  1
                </b>

                <em>
                  Mawphlang diversion
                  ready
                </em>
              </div>
            </article>

            <article>
              <span>
                <Clock3 />
              </span>

              <div>
                <small>
                  Decision refresh
                </small>

                <b>
                  &lt; 60s
                </b>

                <em>
                  Live operational
                  evidence
                </em>
              </div>
            </article>
          </section>

          <div className="delivery-workspace">
            <aside className="delivery-queue">
              <header>
                <div>
                  <span>
                    LIVE MOVEMENT QUEUE
                  </span>

                  <h2>
                    Essential deliveries
                  </h2>
                </div>

                <b>
                  {
                    filteredDeliveries.length
                  }
                </b>
              </header>

              <div className="delivery-filters">
                <button
                  type="button"
                  className={
                    filter === "ALL"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter("ALL")
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    filter ===
                    "HIGH_PRIORITY"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      "HIGH_PRIORITY",
                    )
                  }
                >
                  Priority
                </button>

                <button
                  type="button"
                  className={
                    filter ===
                    "IN_TRANSIT"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      "IN_TRANSIT",
                    )
                  }
                >
                  In transit
                </button>
              </div>

              <div className="delivery-list">
                {filteredDeliveries.map(
                  (delivery) => (
                    <button
                      key={delivery.id}
                      type="button"
                      className={
                        selectedDelivery?.id ===
                        delivery.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        selectDelivery(
                          delivery.id,
                        )
                      }
                    >
                      <header>
                        <span
                          className={`delivery-priority ${delivery.priority.toLowerCase()}`}
                        >
                          {isHighPriority(
                            delivery,
                          ) ? (
                            <AlertTriangle />
                          ) : (
                            <PackageCheck />
                          )}

                          {formatLabel(
                            delivery.priority,
                          )}
                        </span>

                        <em>
                          {formatLabel(
                            delivery.status,
                          )}
                        </em>
                      </header>

                      <b>
                        {
                          delivery.referenceNumber
                        }
                      </b>

                      <p>
                        {formatLabel(
                          delivery.cargoType,
                        )}
                      </p>

                      <footer>
                        <span>
                          <MapPin />

                          {
                            delivery
                              .destinationCommunity
                              .name
                          }
                        </span>

                        <strong>
                          {deliveryProgress(
                            delivery.status,
                          )}
                          %
                        </strong>
                      </footer>

                      <div className="queue-progress">
                        <i
                          style={{
                            width: `${deliveryProgress(
                              delivery.status,
                            )}%`,
                          }}
                        />
                      </div>
                    </button>
                  ),
                )}

                {!loading &&
                  filteredDeliveries.length ===
                    0 && (
                    <div className="delivery-empty">
                      <CheckCircle2 />

                      <b>
                        No matching
                        deliveries
                      </b>

                      <small>
                        Change the queue
                        filter to view
                        other movements.
                      </small>
                    </div>
                  )}
              </div>
            </aside>

            <section className="delivery-command">
              <header className="delivery-command-header">
                <div>
                  <span className="delivery-command-status">
                    <i />

                    {selectedDelivery
                      ? formatLabel(
                          selectedDelivery.status,
                        )
                      : "Planning mode"}
                  </span>

                  <h2>
                    {selectedDelivery
                      ?.referenceNumber ??
                      "No active delivery"}
                  </h2>

                  <p>
                    {selectedDelivery
                      ?.cargoDescription ??
                      "Essential movement coordination"}
                  </p>
                </div>

                <div
                  className="delivery-progress-ring"
                  style={
                    {
                      "--delivery-progress": `${progress * 3.6}deg`,
                    } as CSSProperties
                  }
                >
                  <span>
                    <b>
                      {progress}%
                    </b>

                    <small>
                      complete
                    </small>
                  </span>
                </div>
              </header>

              <div className="delivery-route-summary">
                <div>
                  <span>
                    <MapPin />
                  </span>

                  <p>
                    <small>
                      ORIGIN
                    </small>

                    <b>
                      {selectedDelivery
                        ?.originName ??
                        "Shillong Regional Store"}
                    </b>
                  </p>
                </div>

                <span className="delivery-route-flow">
                  <i />

                  <Truck />

                  <i />
                </span>

                <div>
                  <span>
                    <MapPinned />
                  </span>

                  <p>
                    <small>
                      DESTINATION
                    </small>

                    <b>
                      {selectedDelivery
                        ?.destinationCommunity
                        .name ??
                        "Sohra"}
                    </b>
                  </p>
                </div>
              </div>

              <div className="delivery-map">
                <iframe
                  title="East Khasi Hills delivery movement map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=91.58%2C25.18%2C92.02%2C25.67&layer=mapnik"
                  loading="lazy"
                  tabIndex={-1}
                />

                <div className="delivery-map-tone" />

                <svg
                  viewBox="0 0 900 430"
                  role="img"
                  aria-label="Protected delivery route"
                >
                  <path
                    className="delivery-route-shadow"
                    d="M108 338 C216 310 261 352 354 296 C440 244 470 183 562 179 C646 176 702 134 797 82"
                  />

                  <path
                    className="delivery-route-line"
                    d="M108 338 C216 310 261 352 354 296 C440 244 470 183 562 179 C646 176 702 134 797 82"
                  />
                </svg>

                <div className="delivery-map-weather">
                  <CloudRain />

                  <span>
                    <small>
                      RAINFALL FORECAST
                    </small>

                    <b>
                      42 mm · next 6
                      hours
                    </b>
                  </span>
                </div>

                <span className="delivery-map-origin">
                  <i />

                  Shillong
                </span>

                <span className="delivery-map-destination">
                  <i />

                  Sohra
                </span>

                <div className="delivery-map-vehicle">
                  <Truck />
                </div>

                <div className="delivery-map-route-label">
                  <ShieldCheck />

                  <span>
                    <small>
                      VERIFIED MOVEMENT
                      PATH
                    </small>

                    <b>
                      Mawphlang safer
                      corridor
                    </b>
                  </span>
                </div>

                <div className="delivery-map-legend">
                  <span>
                    <i />

                    Protected route
                  </span>

                  <span>
                    <i />

                    Critical zone avoided
                  </span>
                </div>
              </div>

              <section className="delivery-details">
                <article>
                  <span>
                    <Box />
                  </span>

                  <div>
                    <small>
                      CARGO
                    </small>

                    <b>
                      {selectedDelivery
                        ? formatLabel(
                            selectedDelivery.cargoType,
                          )
                        : "Essential supplies"}
                    </b>

                    <p>
                      {selectedDelivery
                        ?.quantity ?? 0}{" "}
                      {selectedDelivery
                        ?.unit ??
                        "units"}{" "}
                      · Priority movement
                    </p>
                  </div>
                </article>

                <article>
                  <span>
                    <Users />
                  </span>

                  <div>
                    <small>
                      ASSIGNED DRIVER
                    </small>

                    <b>
                      {selectedDelivery
                        ?.assignedDriver
                        ?.fullName ??
                        "Driver assignment pending"}
                    </b>

                    <p>
                      <Phone />

                      {selectedDelivery
                        ?.assignedDriver
                        ?.phone ??
                        "Contact unavailable"}
                    </p>
                  </div>
                </article>

                <article>
                  <span>
                    <Clock3 />
                  </span>

                  <div>
                    <small>
                      ESTIMATED ARRIVAL
                    </small>

                    <b>
                      {formatTime(
                        selectedDelivery
                          ?.estimatedArrivalAt ??
                          null,
                      )}
                    </b>

                    <p>
                      Live ETA · corridor
                      monitored
                    </p>
                  </div>
                </article>
              </section>
            </section>

            <aside className="delivery-context">
              <header>
                <div>
                  <span>
                    DECISION CONTEXT
                  </span>

                  <h2>
                    Movement guidance
                  </h2>
                </div>

                <Bot />
              </header>

              <section className="delivery-agent-consensus">
                <Sparkles />

                <div>
                  <small>
                    AGENT CONSENSUS
                  </small>

                  <b>
                    Safe movement ready
                  </b>
                </div>

                <strong>
                  91%
                </strong>
              </section>

              <section className="delivery-risk-card">
                <header>
                  <AlertTriangle />

                  <span>
                    Corridor watch
                  </span>

                  <b>
                    84/100
                  </b>
                </header>

                <h3>
                  Primary Sohra approach
                  restricted
                </h3>

                <p>
                  Elevated saturation
                  and slope exposure
                  intersect the direct
                  route. The selected
                  delivery remains on
                  the protected
                  diversion.
                </p>

                <div>
                  <span>
                    <CloudRain />

                    <b>
                      42 mm
                    </b>

                    <small>
                      rain window
                    </small>
                  </span>

                  <span>
                    <Users />

                    <b>
                      3
                    </b>

                    <small>
                      communities
                      protected
                    </small>
                  </span>
                </div>
              </section>

              <section className="delivery-timeline">
                <header>
                  <span>
                    LIVE MOVEMENT TRACE
                  </span>

                  <Radio />
                </header>

                <ol>
                  <li className="complete">
                    <i>
                      <CheckCircle2 />
                    </i>

                    <span>
                      <b>
                        Cargo verified
                      </b>

                      <small>
                        Manifest and
                        priority confirmed
                      </small>
                    </span>
                  </li>

                  <li className="complete">
                    <i>
                      <CheckCircle2 />
                    </i>

                    <span>
                      <b>
                        Safer route
                        assigned
                      </b>

                      <small>
                        Mawphlang corridor
                        selected
                      </small>
                    </span>
                  </li>

                  <li className="current">
                    <i>
                      <Truck />
                    </i>

                    <span>
                      <b>
                        Movement in
                        progress
                      </b>

                      <small>
                        Live position
                        monitored
                      </small>
                    </span>
                  </li>

                  <li>
                    <i>
                      <MapPinned />
                    </i>

                    <span>
                      <b>
                        Community handover
                      </b>

                      <small>
                        Awaiting
                        destination
                        arrival
                      </small>
                    </span>
                  </li>
                </ol>
              </section>

              <button
                type="button"
                className={
                  dispatchConfirmed
                    ? "delivery-action confirmed"
                    : "delivery-action"
                }
                disabled={
                  !selectedDelivery
                }
                onClick={() =>
                  setDispatchConfirmed(
                    true,
                  )
                }
              >
                {dispatchConfirmed ? (
                  <CheckCircle2 />
                ) : (
                  <ShieldCheck />
                )}

                {dispatchConfirmed
                  ? "Movement monitoring confirmed"
                  : "Confirm protected movement"}

                {!dispatchConfirmed && (
                  <ChevronRight />
                )}
              </button>

              <footer className="delivery-human-note">
                <Zap />

                <span>
                  <b>
                    Human-supervised
                    operations
                  </b>

                  <small>
                    Critical changes
                    remain authority
                    approved and
                    auditable.
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