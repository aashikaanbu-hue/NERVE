import {
  AlertTriangle,
  Bell,
  Bot,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  PackageCheck,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
  Camera,
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
  getNotifications,
  getSupplyPriorities,
  type RankedSupplyDelivery,
  type SupplyPriorityBand,
  type SupplyPriorityFeed,
} from "../lib/operations";

import "./dashboard.css";
import "./supply-priority.css";

type PriorityFilter =
  | "ALL"
  | SupplyPriorityBand;

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

const emptyFeed: SupplyPriorityFeed = {
  generatedAt:
    new Date(0).toISOString(),

  metrics: {
    total: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
  },

  methodology: {
    cargoUrgency: 25,
    shortageRisk: 20,
    populationImpact: 15,
    delayPressure: 15,
    routeRisk: 15,
    disasterSeverity: 5,
    vehicleReadiness: 5,
    maximumScore: 100,
  },

  priorities: [],
};

function formatText(
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

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
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

function formatPopulation(
  value: number | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.NumberFormat(
    "en-IN",
  ).format(value);
}

function bandLabel(
  band: SupplyPriorityBand,
): string {
  const labels: Record<
    SupplyPriorityBand,
    string
  > = {
    P1: "Immediate",
    P2: "Urgent",
    P3: "Scheduled",
    P4: "Routine",
  };

  return labels[band];
}

function factorStyle(
  value: number,
  maximum: number,
): CSSProperties {
  const width =
    maximum <= 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (value / maximum) *
              100,
          ),
        );

  return {
    "--factor-width":
      `${width}%`,
  } as CSSProperties;
}

export function SupplyPriorityPage() {
  const navigate = useNavigate();

  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      getAuthenticatedUser(),
    );

  const [
    feed,
    setFeed,
  ] =
    useState<SupplyPriorityFeed>(
      emptyFeed,
    );

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

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
    filter,
    setFilter,
  ] =
    useState<PriorityFilter>(
      "ALL",
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadPriorities():
      Promise<void> {
      setLoading(true);

      try {
        const [
          currentUser,
          priorityFeed,
          notifications,
        ] =
          await Promise.all([
            getCurrentUser(),
            getSupplyPriorities(),
            getNotifications(),
          ]);

        if (!mounted) {
          return;
        }

        setUser(currentUser);
        setFeed(priorityFeed);

        setUnreadCount(
          notifications.metrics.unread,
        );

        setSelectedId(
          (current) => {
            if (
              current &&
              priorityFeed.priorities.some(
                (item) =>
                  item.delivery.id ===
                  current,
              )
            ) {
              return current;
            }

            return (
              priorityFeed
                .priorities[0]
                ?.delivery.id ??
              null
            );
          },
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
            : "Supply priorities could not be calculated.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPriorities();

    return () => {
      mounted = false;
    };
  }, [
    navigate,
    refreshVersion,
  ]);

  const filteredPriorities =
    useMemo(() => {
      if (filter === "ALL") {
        return feed.priorities;
      }

      return feed.priorities.filter(
        (item) =>
          item.band === filter,
      );
    }, [
      feed.priorities,
      filter,
    ]);

  const selectedPriority =
    useMemo(
      () =>
        feed.priorities.find(
          (item) =>
            item.delivery.id ===
            selectedId,
        ) ??
        filteredPriorities[0] ??
        feed.priorities[0] ??
        null,
      [
        feed.priorities,
        filteredPriorities,
        selectedId,
      ],
    );

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

  function selectPriority(
    item: RankedSupplyDelivery,
  ): void {
    setSelectedId(
      item.delivery.id,
    );
  }

  if (!user) {
    return null;
  }

  const factorRows =
    selectedPriority
      ? [
          {
            label:
              "Cargo urgency",
            value:
              selectedPriority
                .factors
                .cargoUrgency,
            maximum:
              feed.methodology
                .cargoUrgency,
          },
          {
            label:
              "Shortage risk",
            value:
              selectedPriority
                .factors
                .shortageRisk,
            maximum:
              feed.methodology
                .shortageRisk,
          },
          {
            label:
              "Population impact",
            value:
              selectedPriority
                .factors
                .populationImpact,
            maximum:
              feed.methodology
                .populationImpact,
          },
          {
            label:
              "Delay pressure",
            value:
              selectedPriority
                .factors
                .delayPressure,
            maximum:
              feed.methodology
                .delayPressure,
          },
          {
            label:
              "Route risk",
            value:
              selectedPriority
                .factors
                .routeRisk,
            maximum:
              feed.methodology
                .routeRisk,
          },
          {
            label:
              "Disaster severity",
            value:
              selectedPriority
                .factors
                .disasterSeverity,
            maximum:
              feed.methodology
                .disasterSeverity,
          },
          {
            label:
              "Vehicle readiness",
            value:
              selectedPriority
                .factors
                .vehicleReadiness,
            maximum:
              feed.methodology
                .vehicleReadiness,
          },
        ]
      : [];

  return (
    <div className="dashboard-page supply-priority-page">
      <button
        type="button"
        aria-label="Close navigation"
        className={
          sidebarOpen
            ? "sidebar-scrim visible"
            : "sidebar-scrim"
        }
        onClick={() =>
          setSidebarOpen(false)
        }
      />

      <aside
        className={
          sidebarOpen
            ? "dashboard-sidebar open"
            : "dashboard-sidebar"
        }
      >
        <div className="sidebar-brand">
          <img
            src="/brand/nerve-logo-clean.png"
            alt="NERVE"
          />

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

          <Link to="/dashboard/deliveries">
            <Truck />
            Delivery operations
          </Link>

          <Link
            to="/dashboard/supply-priorities"
            className="active"
          >
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

            {unreadCount > 0 && (
              <strong className="sidebar-alert-count">
                {unreadCount}
              </strong>
            )}
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
            Priority engine online
          </span>

          <small>
            Essential movements are
            continuously ranked using
            operational risk and community
            impact.
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
              {roleLabels[
                user.role
              ]}
            </span>

            <b>
              East Khasi Hills Pilot
            </b>
          </div>

          <div className="dashboard-user">
            <Link
              to="/dashboard/notifications"
              className="notification-button"
              aria-label="Operational alerts"
            >
              <Bell />

              {unreadCount > 0 && (
                <i />
              )}
            </Link>

            <span className="user-avatar">
              {user.fullName
                .charAt(0)
                .toUpperCase()}
            </span>

            <div>
              <b>
                {user.fullName}
              </b>

              <small>
                {user.email}
              </small>
            </div>
          </div>
        </header>

        <div className="supply-priority-content">
          <section className="supply-priority-titlebar">
            <div>
              <span className="dashboard-kicker">
                EXPLAINABLE ESSENTIAL-SUPPLY
                INTELLIGENCE
              </span>

              <h1>
                Supply Priority Engine
              </h1>

              <p>
                Rank critical deliveries
                using urgency, shortage
                exposure, affected
                population, delay pressure,
                route risk and vehicle
                readiness.
              </p>
            </div>

            <div
              className={
                error
                  ? "supply-live-state error"
                  : "supply-live-state"
              }
            >
              {error ? (
                <CircleAlert />
              ) : (
                <Radio />
              )}

              <span>
                <b>
                  {error
                    ? "Priority service needs attention"
                    : "Live ranking active"}
                </b>

                <small>
                  {error ??
                    "Database backed · Explainable scoring · Human supervised"}
                </small>
              </span>

              <button
                type="button"
                aria-label="Refresh priorities"
                onClick={() =>
                  setRefreshVersion(
                    (version) =>
                      version + 1,
                  )
                }
              >
                <RefreshCw
                  className={
                    loading
                      ? "spinning"
                      : ""
                  }
                />
              </button>
            </div>
          </section>

          <section className="supply-metrics">
            <article>
              <span className="metric-icon total">
                <PackageCheck />
              </span>

              <div>
                <small>
                  Ranked movements
                </small>

                <b>
                  {
                    feed.metrics
                      .total
                  }
                </b>

                <em>
                  Active essential
                  deliveries
                </em>
              </div>
            </article>

            <article>
              <span className="metric-icon p1">
                <AlertTriangle />
              </span>

              <div>
                <small>
                  P1 immediate
                </small>

                <b>
                  {feed.metrics.p1}
                </b>

                <em>
                  Life-saving response
                </em>
              </div>
            </article>

            <article>
              <span className="metric-icon p2">
                <Clock3 />
              </span>

              <div>
                <small>
                  P2 urgent
                </small>

                <b>
                  {feed.metrics.p2}
                </b>

                <em>
                  Next operational
                  window
                </em>
              </div>
            </article>

            <article>
              <span className="metric-icon ready">
                <Truck />
              </span>

              <div>
                <small>
                  Vehicle ready
                </small>

                <b>
                  {
                    feed.priorities.filter(
                      (item) =>
                        item.assignedDriver,
                    ).length
                  }
                </b>

                <em>
                  Named driver
                  assigned
                </em>
              </div>
            </article>
          </section>

          {error && (
            <div className="supply-error">
              <CircleAlert />

              <span>
                <b>
                  Priority engine could
                  not refresh
                </b>

                <small>
                  {error}
                </small>
              </span>
            </div>
          )}

          <section className="supply-workspace">
            <aside className="supply-queue">
              <header>
                <div>
                  <span>
                    LIVE PRIORITY QUEUE
                  </span>

                  <h2>
                    Essential movements
                  </h2>
                </div>

                <strong>
                  {
                    filteredPriorities
                      .length
                  }
                </strong>
              </header>

              <div className="supply-filters">
                {(
                  [
                    "ALL",
                    "P1",
                    "P2",
                    "P3",
                    "P4",
                  ] as PriorityFilter[]
                ).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        filter === value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          value,
                        )
                      }
                    >
                      {value === "ALL"
                        ? "All"
                        : value}
                    </button>
                  ),
                )}
              </div>

              <div className="supply-ranking-list">
                {loading &&
                  feed.priorities
                    .length === 0 && (
                    <div className="supply-empty">
                      <RefreshCw className="spinning" />
                      Calculating supply
                      priorities...
                    </div>
                  )}

                {!loading &&
                  filteredPriorities
                    .length === 0 && (
                    <div className="supply-empty">
                      <PackageCheck />

                      No movements match
                      this priority band.
                    </div>
                  )}

                {filteredPriorities.map(
                  (item) => (
                    <button
                      key={
                        item.delivery
                          .id
                      }
                      type="button"
                      className={
                        selectedPriority
                          ?.delivery.id ===
                        item.delivery.id
                          ? "supply-rank-card selected"
                          : "supply-rank-card"
                      }
                      onClick={() =>
                        selectPriority(
                          item,
                        )
                      }
                    >
                      <span className="rank-number">
                        {String(
                          item.rank,
                        ).padStart(
                          2,
                          "0",
                        )}
                      </span>

                      <div>
                        <header>
                          <span
                            className={`priority-band ${item.band.toLowerCase()}`}
                          >
                            {
                              item.band
                            }{" "}
                            ·{" "}
                            {bandLabel(
                              item.band,
                            )}
                          </span>

                          <strong>
                            {
                              item.score
                            }
                            /100
                          </strong>
                        </header>

                        <b>
                          {formatText(
                            item.delivery
                              .cargoType,
                          )}
                        </b>

                        <p>
                          {
                            item
                              .destinationCommunity
                              .name
                          }
                        </p>

                        <footer>
                          <span>
                            <Truck />

                            {formatText(
                              item.delivery
                                .status,
                            )}
                          </span>

                          <ChevronRight />
                        </footer>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </aside>

            <article className="supply-decision">
              {!selectedPriority ? (
                <div className="supply-no-selection">
                  <PackageCheck />

                  <h2>
                    No active supply
                    movements
                  </h2>

                  <p>
                    New essential
                    deliveries will appear
                    here when they are
                    created.
                  </p>
                </div>
              ) : (
                <>
                  <header className="supply-decision-header">
                    <div
                      className={`decision-band ${selectedPriority.band.toLowerCase()}`}
                    >
                      {
                        selectedPriority.band
                      }
                    </div>

                    <div>
                      <span>
                        {
                          selectedPriority
                            .label
                        }
                      </span>

                      <h2>
                        {formatText(
                          selectedPriority
                            .delivery
                            .cargoType,
                        )}
                      </h2>

                      <p>
                        {
                          selectedPriority
                            .delivery
                            .referenceNumber
                        }{" "}
                        ·{" "}
                        {
                          selectedPriority
                            .destinationCommunity
                            .name
                        }
                      </p>
                    </div>

                    <div className="priority-score">
                      <small>
                        PRIORITY SCORE
                      </small>

                      <strong>
                        {
                          selectedPriority
                            .score
                        }
                      </strong>

                      <span>
                        /100
                      </span>
                    </div>
                  </header>

                  <section className="recommended-action">
                    <Sparkles />

                    <div>
                      <span>
                        RECOMMENDED
                        RESPONSE
                      </span>

                      <b>
                        {
                          selectedPriority
                            .recommendedAction
                        }
                      </b>
                    </div>
                  </section>

                  <div className="supply-analysis-grid">
                    <section className="factor-analysis">
                      <header>
                        <div>
                          <span>
                            PRIORITY
                            BREAKDOWN
                          </span>

                          <h3>
                            Why this
                            movement ranks
                            here
                          </h3>
                        </div>

                        <Radio />
                      </header>

                      <div className="factor-list">
                        {factorRows.map(
                          (factor) => (
                            <div
                              key={
                                factor.label
                              }
                              className="factor-row"
                            >
                              <div>
                                <span>
                                  {
                                    factor.label
                                  }
                                </span>

                                <b>
                                  {
                                    factor.value
                                  }
                                  /
                                  {
                                    factor.maximum
                                  }
                                </b>
                              </div>

                              <i
                                style={factorStyle(
                                  factor.value,
                                  factor.maximum,
                                )}
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </section>

                    <section className="reasoning-panel">
                      <header>
                        <div>
                          <span>
                            EXPLAINABLE
                            RANKING
                          </span>

                          <h3>
                            Decision
                            evidence
                          </h3>
                        </div>

                        <CheckCircle2 />
                      </header>

                      <ul>
                        {selectedPriority
                          .reasons.map(
                            (
                              reason,
                            ) => (
                              <li
                                key={
                                  reason
                                }
                              >
                                <CheckCircle2 />

                                <span>
                                  {
                                    reason
                                  }
                                </span>
                              </li>
                            ),
                          )}
                      </ul>
                    </section>
                  </div>

                  <section className="supply-context">
                    <article>
                      <Box />

                      <div>
                        <small>
                          CARGO
                        </small>

                        <b>
                          {selectedPriority
                            .delivery
                            .quantity ??
                            "—"}{" "}
                          {selectedPriority
                            .delivery
                            .unit ??
                            "units"}
                        </b>

                        <span>
                          {
                            selectedPriority
                              .delivery
                              .cargoDescription ??
                            "Essential supplies"
                          }
                        </span>
                      </div>
                    </article>

                    <article>
                      <Users />

                      <div>
                        <small>
                          COMMUNITY
                          IMPACT
                        </small>

                        <b>
                          {formatPopulation(
                            selectedPriority
                              .destinationCommunity
                              .population,
                          )}
                        </b>

                        <span>
                          {formatText(
                            selectedPriority
                              .destinationCommunity
                              .accessStatus,
                          )}
                        </span>
                      </div>
                    </article>

                    <article>
                      <Route />

                      <div>
                        <small>
                          CORRIDOR
                        </small>

                        <b>
                          {selectedPriority
                            .corridor
                            ?.name ??
                            "Route pending"}
                        </b>

                        <span>
                          Risk{" "}
                          {selectedPriority
                            .corridor
                            ?.riskScore ??
                            0}
                          /100
                        </span>
                      </div>
                    </article>

                    <article>
                      <Truck />

                      <div>
                        <small>
                          DRIVER
                        </small>

                        <b>
                          {selectedPriority
                            .assignedDriver
                            ?.fullName ??
                            "Assignment pending"}
                        </b>

                        <span>
                          ETA{" "}
                          {formatDate(
                            selectedPriority
                              .delivery
                              .estimatedArrivalAt,
                          )}
                        </span>
                      </div>
                    </article>
                  </section>
                </>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}