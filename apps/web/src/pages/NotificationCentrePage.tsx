import {
  Activity,
  AlertTriangle,
  Bell,
  BellRing,
  Bot,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareText,
  Navigation,
  PackageCheck,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
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
  markAllNotificationsRead,
  updateNotificationStatus,
  type NotificationFeed,
  type OperationalNotification,
} from "../lib/operations";

import "./dashboard.css";
import "./notification-centre.css";

type FeedFilter =
  | "ALL"
  | "UNREAD"
  | "CRITICAL"
  | "ACKNOWLEDGED";

type NotificationAction =
  | "UNREAD"
  | "READ"
  | "ACKNOWLEDGED"
  | "DISMISSED";

const roleLabels: Record<UserRole, string> = {
  GOVERNMENT_AUTHORITY: "Government Authority",
  LOGISTICS_OPERATOR: "Logistics Operator",
  FIELD_OFFICIAL: "Field Official",
  DRIVER: "Driver",
};

const notificationIcons: Record<
  string,
  ComponentType
> = {
  APPROVAL_DECISION: ShieldCheck,
  RISK_ALERT: AlertTriangle,
  ROUTE_UPDATE: Route,
  DELIVERY_UPDATE: Truck,
  COMMUNITY_IMPACT: Users,
  SYSTEM_UPDATE: Radio,
};

const emptyFeed: NotificationFeed = {
  generatedAt: new Date(0).toISOString(),

  metrics: {
    total: 0,
    unread: 0,
    critical: 0,
    acknowledged: 0,
  },

  notifications: [],
};

function formatText(value: string): string {
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
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timeAgo(value: string): string {
  const difference =
    Date.now() - new Date(value).getTime();

  const minutes = Math.max(
    0,
    Math.floor(difference / 60_000),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  return `${Math.floor(hours / 24)} day ago`;
}

function confidencePercent(
  confidence: number,
): number {
  return Math.round(
    confidence <= 1
      ? confidence * 100
      : confidence,
  );
}

function matchesFilter(
  notification: OperationalNotification,
  filter: FeedFilter,
): boolean {
  if (filter === "ALL") {
    return notification.status !== "DISMISSED";
  }

  if (filter === "CRITICAL") {
    return (
      notification.severity === "CRITICAL" &&
      notification.status !== "DISMISSED"
    );
  }

  return notification.status === filter;
}

function statusTone(status: string): string {
  return status.toLowerCase();
}

export function NotificationCentrePage() {
  const navigate = useNavigate();

  const [user, setUser] =
    useState<AuthUser | null>(
      getAuthenticatedUser(),
    );

  const [feed, setFeed] =
    useState<NotificationFeed>(emptyFeed);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [filter, setFilter] =
    useState<FeedFilter>("ALL");

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [updating, setUpdating] =
    useState<
      NotificationAction | "ALL" | null
    >(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications(): Promise<void> {
      setLoading(true);

      try {
        const [
          currentUser,
          notificationFeed,
        ] = await Promise.all([
          getCurrentUser(),
          getNotifications(),
        ]);

        if (!mounted) {
          return;
        }

        setUser(currentUser);
        setFeed(notificationFeed);

        setSelectedId((current) => {
          if (
            current &&
            notificationFeed.notifications.some(
              (notification) =>
                notification.id === current,
            )
          ) {
            return current;
          }

          return (
            notificationFeed.notifications.find(
              (notification) =>
                notification.status === "UNREAD",
            )?.id ??
            notificationFeed.notifications[0]?.id ??
            null
          );
        });

        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (!getAuthenticatedUser()) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "The operational alert feed could not be loaded.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, [navigate, refreshVersion]);

  const filteredNotifications = useMemo(
    () =>
      feed.notifications.filter(
        (notification) =>
          matchesFilter(
            notification,
            filter,
          ),
      ),
    [feed.notifications, filter],
  );

  const selectedNotification = useMemo(
    () =>
      feed.notifications.find(
        (notification) =>
          notification.id === selectedId,
      ) ?? null,
    [feed.notifications, selectedId],
  );

  async function handleLogout(): Promise<void> {
    await logout();

    navigate("/login", {
      replace: true,
    });
  }

  async function handleStatusChange(
    status: NotificationAction,
  ): Promise<void> {
    if (!selectedNotification) {
      return;
    }

    setUpdating(status);
    setNotice(null);

    try {
      await updateNotificationStatus(
        selectedNotification.id,
        status,
      );

      setNotice(
        status === "ACKNOWLEDGED"
          ? "Alert acknowledged and added to the operational audit trail."
          : status === "DISMISSED"
            ? "Alert dismissed from the active feed."
            : status === "UNREAD"
              ? "Alert returned to the unread queue."
              : "Alert marked as read.",
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The alert status could not be updated.",
      );
    } finally {
      setUpdating(null);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    setUpdating("ALL");
    setNotice(null);

    try {
      const updated =
        await markAllNotificationsRead();

      setNotice(
        updated > 0
          ? `${updated} operational alerts marked as read.`
          : "There are no unread alerts.",
      );

      setRefreshVersion(
        (version) => version + 1,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unread alerts could not be updated.",
      );
    } finally {
      setUpdating(null);
    }
  }

  if (!user) {
    return null;
  }

  const SelectedIcon = selectedNotification
    ? notificationIcons[
        selectedNotification.type
      ] ?? BellRing
    : BellRing;

  const recommendation =
    selectedNotification?.sourceRecommendation ??
    null;

  return (
    <div className="dashboard-page notification-centre-page">
      <button
        type="button"
        aria-label="Close navigation"
        className={
          sidebarOpen
            ? "sidebar-scrim visible"
            : "sidebar-scrim"
        }
        onClick={() => setSidebarOpen(false)}
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
          <Link to="/dashboard/supply-priorities">
  <PackageCheck />
  Supply priorities
</Link>

          <Link to="/dashboard/approvals">
            <ShieldCheck />
            Approval centre
          </Link>

          <Link
            to="/dashboard/notifications"
            className="active"
          >
            <BellRing />
            Alert centre

            {feed.metrics.unread > 0 && (
              <strong className="sidebar-alert-count">
                {feed.metrics.unread}
              </strong>
            )}
          </Link>

          <Link to="/dashboard/agents">
            <Bot />
            Agent activity
          </Link>
        </nav>

        <div className="sidebar-agent">
          <span>
            <i />
            Alert delivery online
          </span>

          <small>
            Approved actions are converted into
            role-aware operational alerts.
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
              {roleLabels[user.role]}
            </span>

            <b>East Khasi Hills Pilot</b>
          </div>

          <div className="dashboard-user">
            <Link
              to="/dashboard/notifications"
              className="notification-button"
              aria-label="Operational alerts"
            >
              <Bell />

              {feed.metrics.unread > 0 && (
                <i />
              )}
            </Link>

            <span className="user-avatar">
              {user.fullName
                .charAt(0)
                .toUpperCase()}
            </span>

            <div>
              <b>{user.fullName}</b>
              <small>{user.email}</small>
            </div>
          </div>
        </header>

        <div className="notification-content">
          <section className="notification-titlebar">
            <div>
              <span className="dashboard-kicker">
                ROLE-AWARE OPERATIONAL DELIVERY
              </span>

              <h1>
                Alerts &amp; Notification Centre
              </h1>

              <p>
                Convert approved decisions into
                timely, accountable instructions
                for authorities, logistics teams,
                field officers and drivers.
              </p>
            </div>

            <div
              className={
                error
                  ? "notification-live-state error"
                  : "notification-live-state"
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
                    ? "Alert service needs attention"
                    : "Delivery channel live"}
                </b>

                <small>
                  {error ??
                    "Role matched · Database backed · Fully audited"}
                </small>
              </span>

              <button
                type="button"
                aria-label="Refresh notifications"
                disabled={loading}
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
                      : undefined
                  }
                />
              </button>
            </div>
          </section>

          <section className="notification-metrics">
            <article>
              <span>
                <BellRing />
              </span>

              <div>
                <small>Total alerts</small>
                <b>{feed.metrics.total}</b>
                <em>
                  Delivered to this workspace
                </em>
              </div>
            </article>

            <article>
              <span>
                <Sparkles />
              </span>

              <div>
                <small>Unread</small>
                <b>{feed.metrics.unread}</b>
                <em>
                  Require operator attention
                </em>
              </div>
            </article>

            <article>
              <span>
                <AlertTriangle />
              </span>

              <div>
                <small>Critical</small>
                <b>{feed.metrics.critical}</b>
                <em>
                  Active high-priority signal
                </em>
              </div>
            </article>

            <article>
              <span>
                <CheckCheck />
              </span>

              <div>
                <small>Acknowledged</small>
                <b>
                  {feed.metrics.acknowledged}
                </b>
                <em>
                  Confirmed by a named user
                </em>
              </div>
            </article>
          </section>

          {notice && (
            <div className="notification-notice">
              <Check />

              <span>{notice}</span>

              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() =>
                  setNotice(null)
                }
              >
                <X />
              </button>
            </div>
          )}

          <section className="notification-workspace">
            <div className="notification-feed-panel">
              <header>
                <div>
                  <span>
                    LIVE ALERT FEED
                  </span>

                  <h2>
                    Operational inbox
                  </h2>
                </div>

                <b>
                  {
                    filteredNotifications.length
                  }
                </b>
              </header>

              <div className="notification-toolbar">
                <div className="notification-filters">
                  {(
                    [
                      "ALL",
                      "UNREAD",
                      "CRITICAL",
                      "ACKNOWLEDGED",
                    ] as FeedFilter[]
                  ).map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={
                        filter === item
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(item)
                      }
                    >
                      {formatText(item)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mark-all-read"
                  disabled={
                    updating === "ALL" ||
                    feed.metrics.unread === 0
                  }
                  onClick={() =>
                    void handleMarkAllRead()
                  }
                >
                  <CheckCheck />
                  Mark all read
                </button>
              </div>

              <div className="notification-list">
                {loading &&
                  feed.notifications.length ===
                    0 && (
                    <div className="notification-empty">
                      <Activity className="pulse-icon" />

                      <b>
                        Synchronising operational
                        alerts
                      </b>

                      <small>
                        Matching approved actions
                        to your workspace role.
                      </small>
                    </div>
                  )}

                {!loading &&
                  filteredNotifications.length ===
                    0 && (
                    <div className="notification-empty">
                      <CheckCheck />

                      <b>
                        No alerts in this view
                      </b>

                      <small>
                        The selected queue is
                        currently clear.
                      </small>
                    </div>
                  )}

                {filteredNotifications.map(
                  (notification) => {
                    const ItemIcon =
                      notificationIcons[
                        notification.type
                      ] ?? BellRing;

                    return (
                      <button
                        type="button"
                        key={notification.id}
                        className={[
                          selectedId ===
                          notification.id
                            ? "selected"
                            : "",

                          notification.status ===
                          "UNREAD"
                            ? "unread"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          setSelectedId(
                            notification.id,
                          )
                        }
                      >
                        <i
                          className={notification.type.toLowerCase()}
                        >
                          <ItemIcon />
                        </i>

                        <span>
                          <small>
                            {formatText(
                              notification.type,
                            )}{" "}
                            ·{" "}
                            {formatText(
                              notification.severity,
                            )}
                          </small>

                          <b>
                            {notification.title}
                          </b>

                          <em>
                            {timeAgo(
                              notification.deliveredAt,
                            )}
                          </em>
                        </span>

                        <strong
                          className={statusTone(
                            notification.status,
                          )}
                        >
                          {formatText(
                            notification.status,
                          )}
                        </strong>

                        <ChevronRight />
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="notification-detail-panel">
              {selectedNotification ? (
                <>
                  <header className="notification-detail-header">
                    <span
                      className={`notification-main-icon ${selectedNotification.type.toLowerCase()}`}
                    >
                      <SelectedIcon />
                    </span>

                    <div>
                      <small>
                        {formatText(
                          selectedNotification.type,
                        )}{" "}
                        · OPERATIONAL BRIEF
                      </small>

                      <h2>
                        {
                          selectedNotification.title
                        }
                      </h2>

                      <p>
                        Delivered{" "}
                        {formatDate(
                          selectedNotification.deliveredAt,
                        )}
                      </p>
                    </div>

                    <strong
                      className={statusTone(
                        selectedNotification.status,
                      )}
                    >
                      <i />

                      {formatText(
                        selectedNotification.status,
                      )}
                    </strong>
                  </header>

                  <section className="notification-signal-strip">
                    <article>
                      <AlertTriangle />

                      <span>
                        <small>SEVERITY</small>

                        <b>
                          {formatText(
                            selectedNotification.severity,
                          )}
                        </b>
                      </span>
                    </article>

                    <article>
                      <Bot />

                      <span>
                        <small>
                          SOURCE AGENT
                        </small>

                        <b>
                          {recommendation
                            ? `NERVE ${formatText(
                                recommendation.agentType,
                              )}`
                            : "NERVE Command"}
                        </b>
                      </span>
                    </article>

                    <article>
                      <Sparkles />

                      <span>
                        <small>
                          CONFIDENCE
                        </small>

                        <b>
                          {recommendation
                            ? `${confidencePercent(
                                recommendation.confidence,
                              )}%`
                            : "Verified"}
                        </b>
                      </span>
                    </article>

                    <article>
                      <Clock3 />

                      <span>
                        <small>
                          DELIVERY STATE
                        </small>

                        <b>
                          Database confirmed
                        </b>
                      </span>
                    </article>
                  </section>

                  <section className="notification-message-block">
                    <header>
                      <div>
                        <span>
                          OPERATIONAL MESSAGE
                        </span>

                        <h3>
                          What the response team
                          needs to know
                        </h3>
                      </div>

                      <MessageSquareText />
                    </header>

                    <p>
                      {
                        selectedNotification.message
                      }
                    </p>
                  </section>

                  <section className="notification-context-grid">
                    <article>
                      <MapPinned />

                      <span>
                        <small>
                          CORRIDOR
                        </small>

                        <b>
                          {recommendation
                            ?.corridor?.name ??
                            "Regional operational network"}
                        </b>

                        <em>
                          {recommendation
                            ?.corridor?.code ??
                            "Role-wide instruction"}
                        </em>
                      </span>
                    </article>

                    <article>
                      <AlertTriangle />

                      <span>
                        <small>
                          INCIDENT
                        </small>

                        <b>
                          {recommendation
                            ?.incident
                            ?.referenceNumber ??
                            "Approved preventive action"}
                        </b>

                        <em>
                          {recommendation
                            ?.incident?.title ??
                            "No direct incident link"}
                        </em>
                      </span>
                    </article>

                    <article>
                      <PackageCheck />

                      <span>
                        <small>
                          DELIVERY
                        </small>

                        <b>
                          {recommendation
                            ?.delivery
                            ?.referenceNumber ??
                            "Network-wide action"}
                        </b>

                        <em>
                          {recommendation
                            ?.delivery?.cargoType ??
                            "No direct delivery link"}
                        </em>
                      </span>
                    </article>
                  </section>

                  <section className="notification-handling">
                    <header>
                      <div>
                        <span>
                          HUMAN HANDLING
                        </span>

                        <h3>
                          Confirm receipt and
                          continue the response
                        </h3>
                      </div>

                      <FileCheck2 />
                    </header>

                    <div className="notification-handling-status">
                      <article>
                        <i className="complete">
                          <Check />
                        </i>

                        <span>
                          <small>
                            01 · GENERATED
                          </small>

                          <b>
                            Approved action
                            converted to alert
                          </b>

                          <em>
                            {formatDate(
                              selectedNotification.createdAt,
                            )}
                          </em>
                        </span>
                      </article>

                      <article>
                        <i
                          className={
                            selectedNotification.readAt
                              ? "complete"
                              : ""
                          }
                        >
                          {selectedNotification.readAt ? (
                            <Check />
                          ) : (
                            <Clock3 />
                          )}
                        </i>

                        <span>
                          <small>
                            02 · READ
                          </small>

                          <b>
                            {selectedNotification.readAt
                              ? "Alert opened by workspace user"
                              : "Waiting for alert review"}
                          </b>

                          <em>
                            {formatDate(
                              selectedNotification.readAt,
                            )}
                          </em>
                        </span>
                      </article>

                      <article>
                        <i
                          className={
                            selectedNotification.acknowledgedAt
                              ? "complete"
                              : ""
                          }
                        >
                          {selectedNotification.acknowledgedAt ? (
                            <CheckCheck />
                          ) : (
                            <Radio />
                          )}
                        </i>

                        <span>
                          <small>
                            03 · ACKNOWLEDGED
                          </small>

                          <b>
                            {selectedNotification.acknowledgedAt
                              ? "Response ownership confirmed"
                              : "Awaiting named acknowledgement"}
                          </b>

                          <em>
                            {formatDate(
                              selectedNotification.acknowledgedAt,
                            )}
                          </em>
                        </span>
                      </article>
                    </div>

                    <div className="notification-actions">
                      {selectedNotification.status ===
                      "UNREAD" ? (
                        <button
                          type="button"
                          className="read"
                          disabled={
                            updating !== null
                          }
                          onClick={() =>
                            void handleStatusChange(
                              "READ",
                            )
                          }
                        >
                          <Check />
                          Mark as read
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="unread"
                          disabled={
                            updating !== null
                          }
                          onClick={() =>
                            void handleStatusChange(
                              "UNREAD",
                            )
                          }
                        >
                          <Bell />
                          Mark unread
                        </button>
                      )}

                      <button
                        type="button"
                        className="dismiss"
                        disabled={
                          updating !== null ||
                          selectedNotification.status ===
                            "DISMISSED"
                        }
                        onClick={() =>
                          void handleStatusChange(
                            "DISMISSED",
                          )
                        }
                      >
                        <X />
                        Dismiss
                      </button>

                      <button
                        type="button"
                        className="acknowledge"
                        disabled={
                          updating !== null ||
                          selectedNotification.status ===
                            "ACKNOWLEDGED"
                        }
                        onClick={() =>
                          void handleStatusChange(
                            "ACKNOWLEDGED",
                          )
                        }
                      >
                        <CheckCheck />
                        Acknowledge alert
                      </button>
                    </div>

                    {selectedNotification.actionUrl && (
                      <button
                        type="button"
                        className="open-workspace-action"
                        onClick={() =>
                          navigate(
                            selectedNotification.actionUrl ??
                              "/dashboard",
                          )
                        }
                      >
                        <Navigation />

                        Open linked operational
                        workspace

                        <ChevronRight />
                      </button>
                    )}
                  </section>
                </>
              ) : (
                <div className="notification-no-selection">
                  <BellRing />

                  <h2>
                    Operational inbox is clear
                  </h2>

                  <p>
                    New approved actions for this
                    role will appear here
                    automatically.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}