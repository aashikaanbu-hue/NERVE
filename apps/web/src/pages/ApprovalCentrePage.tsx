import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleX,
  Clock3,
  FileCheck2,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareText,
  Network,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Truck,
  UserCheck,
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
  getRecommendations,
  reviewRecommendation,
  type ApprovalRecommendation,
} from "../lib/operations";

import "./dashboard.css";
import "./approval-centre.css";

type QueueFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type Decision =
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

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

const agentIcons:
  Record<string, ComponentType> = {
    SENSE: Gauge,
    IMPACT: Network,
    ROUTE: Route,
    COMMAND: Radio,
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

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
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

function formatValue(
  value: unknown,
): string {
  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    typeof value ===
    "number"
  ) {
    return new Intl.NumberFormat(
      "en-IN",
    ).format(value);
  }

  if (
    typeof value ===
    "string"
  ) {
    const date =
      new Date(value);

    if (
      value.includes("T") &&
      !Number.isNaN(
        date.getTime(),
      )
    ) {
      return formatDate(
        value,
      );
    }

    return formatLabel(
      value,
    );
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        (item) =>
          formatValue(item),
      )
      .join(", ");
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object.entries(
      value,
    )
      .map(
        ([key, item]) =>
          `${formatLabel(key)}: ${formatValue(item)}`,
      )
      .join(" · ");
  }

  return "Not available";
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

function isPending(
  recommendation:
    ApprovalRecommendation,
): boolean {
  return [
    "PROPOSED",
    "AWAITING_APPROVAL",
  ].includes(
    recommendation.status
      .toUpperCase(),
  );
}

function matchesFilter(
  recommendation:
    ApprovalRecommendation,

  filter:
    QueueFilter,
): boolean {
  if (
    filter === "ALL"
  ) {
    return true;
  }

  if (
    filter === "PENDING"
  ) {
    return isPending(
      recommendation,
    );
  }

  return (
    recommendation.status
      .toUpperCase() ===
    filter
  );
}

function agentName(
  agentType: string,
): string {
  return `NERVE ${formatLabel(
    agentType,
  )}`;
}

function statusTone(
  status: string,
): string {
  const normalized =
    status.toUpperCase();

  if (
    normalized ===
    "APPROVED"
  ) {
    return "approved";
  }

  if (
    normalized ===
    "REJECTED"
  ) {
    return "rejected";
  }

  if (
    normalized ===
    "EXECUTED"
  ) {
    return "executed";
  }

  return "pending";
}

export function ApprovalCentrePage() {
  const navigate =
    useNavigate();

  const [
    user,
    setUser,
  ] = useState<AuthUser | null>(
    getAuthenticatedUser(),
  );

  const [
    recommendations,
    setRecommendations,
  ] = useState<
    ApprovalRecommendation[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    filter,
    setFilter,
  ] = useState<QueueFilter>(
    "PENDING",
  );

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState<
    Decision | null
  >(null);

  const [
    notice,
    setNotice,
  ] = useState<
    string | null
  >(null);

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  useEffect(
    () => {
      let mounted =
        true;

      async function loadApprovals():
        Promise<void> {
        setLoading(true);

        try {
          const [
            currentUser,
            queue,
          ] =
            await Promise.all([
              getCurrentUser(),
              getRecommendations(),
            ]);

          if (!mounted) {
            return;
          }

          setUser(
            currentUser,
          );

          setRecommendations(
            queue,
          );

          const firstPending =
            queue.find(
              isPending,
            );

          setSelectedId(
            (current) =>
              current &&
              queue.some(
                (item) =>
                  item.id ===
                  current,
              )
                ? current
                : firstPending
                    ?.id ??
                  queue[0]
                    ?.id ??
                  null,
          );

          setError(null);
        } catch (
          loadError
        ) {
          if (!mounted) {
            return;
          }

          if (
            !getAuthenticatedUser()
          ) {
            navigate(
              "/login",
              {
                replace:
                  true,
              },
            );

            return;
          }

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Approval queue could not be loaded.",
          );
        } finally {
          if (mounted) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadApprovals();

      return () => {
        mounted = false;
      };
    },
    [
      navigate,
      refreshVersion,
    ],
  );

  const filteredRecommendations =
    useMemo(
      () =>
        recommendations.filter(
          (
            recommendation,
          ) =>
            matchesFilter(
              recommendation,
              filter,
            ),
        ),

      [
        filter,
        recommendations,
      ],
    );

  const selectedRecommendation =
    recommendations.find(
      (
        recommendation,
      ) =>
        recommendation.id ===
        selectedId,
    ) ??
    filteredRecommendations[0] ??
    recommendations[0];

  const pendingCount =
    recommendations.filter(
      isPending,
    ).length;

  const criticalCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        isPending(
          recommendation,
        ) &&
        recommendation
          .priority
          .toUpperCase() ===
          "CRITICAL",
    ).length;

  const approvedCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation
          .status
          .toUpperCase() ===
        "APPROVED",
    ).length;

  const reviewedCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation
          .reviewedAt !==
        null,
    ).length;

  const canReview =
    user?.role ===
    "GOVERNMENT_AUTHORITY";

  const evidenceEntries =
    Object.entries(
      selectedRecommendation
        ?.evidence ?? {},
    );

  const actionEntries =
    Object.entries(
      selectedRecommendation
        ?.proposedAction ??
        {},
    );

  const SelectedAgentIcon =
    agentIcons[
      selectedRecommendation
        ?.agentType
        .toUpperCase() ??
        "COMMAND"
    ] ?? Bot;

  async function handleLogout():
    Promise<void> {
    await logout();

    navigate(
      "/login",
      {
        replace:
          true,
      },
    );
  }

  function selectFilter(
    nextFilter:
      QueueFilter,
  ): void {
    setFilter(
      nextFilter,
    );

    setNotice(null);
    setComment("");

    const firstMatch =
      recommendations.find(
        (
          recommendation,
        ) =>
          matchesFilter(
            recommendation,
            nextFilter,
          ),
      );

    setSelectedId(
      firstMatch?.id ??
        null,
    );
  }

  function selectRecommendation(
    recommendationId:
      string,
  ): void {
    setSelectedId(
      recommendationId,
    );

    setComment("");
    setNotice(null);
  }

  async function submitDecision(
    decision: Decision,
  ): Promise<void> {
    if (
      !selectedRecommendation ||
      !canReview ||
      !isPending(
        selectedRecommendation,
      )
    ) {
      return;
    }

    if (
      decision !==
        "APPROVED" &&
      comment
        .trim()
        .length < 3
    ) {
      setError(
        "Add a short reason before rejecting or requesting changes.",
      );

      return;
    }

    setSubmitting(
      decision,
    );

    setError(null);
    setNotice(null);

    try {
      const updated =
        await reviewRecommendation(
          selectedRecommendation.id,
          decision,
          comment,
        );

      setRecommendations(
        (current) =>
          current.map(
            (
              recommendation,
            ) =>
              recommendation.id ===
              updated.id
                ? updated
                : recommendation,
          ),
      );

      setComment("");

      setNotice(
        decision ===
          "APPROVED"
          ? "Action approved and the accountable audit trail was recorded."
          : decision ===
              "REJECTED"
            ? "Recommendation rejected and the decision was recorded."
            : "Changes requested from the responsible NERVE agent.",
      );
    } catch (
      decisionError
    ) {
      setError(
        decisionError instanceof
          Error
          ? decisionError.message
          : "The decision could not be recorded.",
      );
    } finally {
      setSubmitting(
        null,
      );
    }
  }

  if (
    loading &&
    !user
  ) {
    return (
      <div className="dashboard-loading">
        <Activity />

        <span>
          Loading approval centre...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-page approval-centre-page">
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
              setSidebarOpen(
                false,
              )
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
            to="/dashboard/approvals"
            className="active"
          >
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
            Human authority online
          </span>

          <small>
            Critical actions remain locked until a named reviewer decides.
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
              setSidebarOpen(
                true,
              )
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
            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
            >
              <Bell />

              {pendingCount >
                0 && <i />}
            </button>

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

        <div className="approval-content">
          <section className="approval-titlebar">
            <div>
              <span className="dashboard-kicker">
                ACCOUNTABLE HUMAN CONTROL
              </span>

              <h1>
                Human Approval Centre
              </h1>

              <p>
                Review agent evidence, inspect expected impact and record a named decision before critical action begins.
              </p>
            </div>

            <div
              className={
                error
                  ? "approval-live-state error"
                  : "approval-live-state"
              }
            >
              <ShieldCheck />

              <span>
                <b>
                  {error
                    ? "Decision service needs attention"
                    : "Approval controls active"}
                </b>

                <small>
                  {error ??
                    "Signed decisions · Evidence linked · Fully audited"}
                </small>
              </span>

              <button
                type="button"
                aria-label="Refresh approval queue"
                disabled={
                  loading
                }
                onClick={() =>
                  setRefreshVersion(
                    (
                      version,
                    ) =>
                      version +
                      1,
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

          <section className="approval-metrics">
            <article>
              <span>
                <TimerReset />
              </span>

              <div>
                <small>
                  Awaiting authority
                </small>

                <b>
                  {pendingCount}
                </b>

                <em>
                  Decisions requiring review
                </em>
              </div>
            </article>

            <article>
              <span>
                <AlertTriangle />
              </span>

              <div>
                <small>
                  Critical priority
                </small>

                <b>
                  {criticalCount}
                </b>

                <em>
                  Immediate attention queue
                </em>
              </div>
            </article>

            <article>
              <span>
                <CheckCircle2 />
              </span>

              <div>
                <small>
                  Approved actions
                </small>

                <b>
                  {approvedCount}
                </b>

                <em>
                  Verified authority decisions
                </em>
              </div>
            </article>

            <article>
              <span>
                <FileCheck2 />
              </span>

              <div>
                <small>
                  Audit coverage
                </small>

                <b>
                  {reviewedCount}
                </b>

                <em>
                  Named decision records
                </em>
              </div>
            </article>
          </section>

          {notice && (
            <div className="approval-notice">
              <CheckCircle2 />

              <span>
                {notice}
              </span>

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

          <section className="approval-workspace">
            <aside className="approval-queue">
              <header>
                <div>
                  <span>
                    DECISION QUEUE
                  </span>

                  <h2>
                    Priority actions
                  </h2>
                </div>

                <b>
                  {
                    filteredRecommendations.length
                  }
                </b>
              </header>

              <div className="approval-filters">
                {(
                  [
                    "PENDING",
                    "ALL",
                    "APPROVED",
                    "REJECTED",
                  ] as QueueFilter[]
                ).map(
                  (item) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      className={
                        filter ===
                        item
                          ? "active"
                          : undefined
                      }
                      onClick={() =>
                        selectFilter(
                          item,
                        )
                      }
                    >
                      {formatLabel(
                        item,
                      )}
                    </button>
                  ),
                )}
              </div>

              <div className="approval-queue-list">
                {filteredRecommendations.map(
                  (
                    recommendation,
                  ) => {
                    const Icon =
                      agentIcons[
                        recommendation.agentType.toUpperCase()
                      ] ?? Bot;

                    return (
                      <button
                        key={
                          recommendation.id
                        }
                        type="button"
                        className={
                          recommendation.id ===
                          selectedRecommendation?.id
                            ? "selected"
                            : undefined
                        }
                        onClick={() =>
                          selectRecommendation(
                            recommendation.id,
                          )
                        }
                      >
                        <i
                          className={recommendation.agentType.toLowerCase()}
                        >
                          <Icon />
                        </i>

                        <span>
                          <small>
                            {agentName(
                              recommendation.agentType,
                            )}
                            {" · "}
                            {formatLabel(
                              recommendation.priority,
                            )}
                          </small>

                          <b>
                            {
                              recommendation.title
                            }
                          </b>

                          <em>
                            {recommendation.corridor?.name ??
                              recommendation.incident?.referenceNumber ??
                              "Regional response"}
                          </em>
                        </span>

                        <strong
                          className={statusTone(
                            recommendation.status,
                          )}
                        >
                          {formatLabel(
                            recommendation.status,
                          )}
                        </strong>

                        <ChevronRight />
                      </button>
                    );
                  },
                )}

                {!loading &&
                  filteredRecommendations.length ===
                    0 && (
                    <div className="approval-empty">
                      <CheckCircle2 />

                      <b>
                        No decisions here
                      </b>

                      <small>
                        This section of the queue is clear.
                      </small>
                    </div>
                  )}
              </div>
            </aside>

            <div className="approval-decision-panel">
              {selectedRecommendation ? (
                <>
                  <header className="approval-decision-header">
                    <span
                      className={`approval-agent-icon ${selectedRecommendation.agentType.toLowerCase()}`}
                    >
                      <SelectedAgentIcon />
                    </span>

                    <div>
                      <small>
                        {agentName(
                          selectedRecommendation.agentType,
                        )}
                        {" · DECISION BRIEF"}
                      </small>

                      <h2>
                        {
                          selectedRecommendation.title
                        }
                      </h2>

                      <p>
                        Created{" "}
                        {formatDate(
                          selectedRecommendation.createdAt,
                        )}

                        {selectedRecommendation.expiresAt
                          ? ` · Expires ${formatDate(
                              selectedRecommendation.expiresAt,
                            )}`
                          : ""}
                      </p>
                    </div>

                    <strong
                      className={statusTone(
                        selectedRecommendation.status,
                      )}
                    >
                      <i />

                      {formatLabel(
                        selectedRecommendation.status,
                      )}
                    </strong>
                  </header>

                  <section className="approval-assurance-strip">
                    <article>
                      <Sparkles />

                      <span>
                        <small>
                          AGENT CONFIDENCE
                        </small>

                        <b>
                          {confidencePercent(
                            selectedRecommendation.confidence,
                          )}
                          %
                        </b>
                      </span>
                    </article>

                    <article>
                      <AlertTriangle />

                      <span>
                        <small>
                          PRIORITY
                        </small>

                        <b>
                          {formatLabel(
                            selectedRecommendation.priority,
                          )}
                        </b>
                      </span>
                    </article>

                    <article>
                      <Gauge />

                      <span>
                        <small>
                          CORRIDOR RISK
                        </small>

                        <b>
                          {Math.round(
                            selectedRecommendation.roadSegment?.riskScore ??
                              selectedRecommendation.corridor?.riskScore ??
                              0,
                          )}
                          /100
                        </b>
                      </span>
                    </article>

                    <article>
                      <ShieldCheck />

                      <span>
                        <small>
                          AUTHORITY LOCK
                        </small>

                        <b>
                          {selectedRecommendation.requiresApproval
                            ? "Required"
                            : "Advisory"}
                        </b>
                      </span>
                    </article>
                  </section>

                  <section className="approval-reasoning">
                    <header>
                      <div>
                        <span>
                          WHY THIS ACTION
                        </span>

                        <h3>
                          Agent reasoning
                        </h3>
                      </div>

                      <GitBranch />
                    </header>

                    <p>
                      {
                        selectedRecommendation.reasoning
                      }
                    </p>
                  </section>

                  <section className="approval-evidence-action">
                    <div className="approval-evidence">
                      <header>
                        <div>
                          <span>
                            VERIFIED EVIDENCE
                          </span>

                          <h3>
                            Signals behind the recommendation
                          </h3>
                        </div>

                        <FileCheck2 />
                      </header>

                      <dl>
                        {evidenceEntries.map(
                          (
                            [
                              key,
                              value,
                            ],
                          ) => (
                            <div
                              key={
                                key
                              }
                            >
                              <dt>
                                {formatLabel(
                                  key,
                                )}
                              </dt>

                              <dd>
                                {formatValue(
                                  value,
                                )}
                              </dd>

                              <CheckCircle2 />
                            </div>
                          ),
                        )}

                        {evidenceEntries.length ===
                          0 && (
                          <div>
                            <dt>
                              Evidence state
                            </dt>

                            <dd>
                              Trace linked to agent run
                            </dd>

                            <CheckCircle2 />
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="approval-proposed-action">
                      <header>
                        <div>
                          <span>
                            PROPOSED RESPONSE
                          </span>

                          <h3>
                            Action requiring authority
                          </h3>
                        </div>

                        <Radio />
                      </header>

                      <dl>
                        {actionEntries.map(
                          (
                            [
                              key,
                              value,
                            ],
                          ) => (
                            <div
                              key={
                                key
                              }
                            >
                              <dt>
                                {formatLabel(
                                  key,
                                )}
                              </dt>

                              <dd>
                                {formatValue(
                                  value,
                                )}
                              </dd>
                            </div>
                          ),
                        )}

                        {actionEntries.length ===
                          0 && (
                          <div>
                            <dt>
                              Action state
                            </dt>

                            <dd>
                              Awaiting final response plan
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </section>

                  <section className="approval-linked-context">
                    <article>
                      <MapPinned />

                      <span>
                        <small>
                          CORRIDOR
                        </small>

                        <b>
                          {selectedRecommendation.corridor?.name ??
                            "Regional operation"}
                        </b>

                        <em>
                          {selectedRecommendation.roadSegment?.name ??
                            selectedRecommendation.corridor?.status ??
                            "Multiple locations"}
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
                          {selectedRecommendation.incident?.referenceNumber ??
                            "Preventive watch"}
                        </b>

                        <em>
                          {selectedRecommendation.incident?.title ??
                            "No incident directly linked"}
                        </em>
                      </span>
                    </article>

                    <article>
                      <Truck />

                      <span>
                        <small>
                          DELIVERY
                        </small>

                        <b>
                          {selectedRecommendation.delivery?.referenceNumber ??
                            "Network-wide action"}
                        </b>

                        <em>
                          {selectedRecommendation.delivery
                            ? `${formatLabel(
                                selectedRecommendation.delivery.cargoType,
                              )} · ${formatLabel(
                                selectedRecommendation.delivery.status,
                              )}`
                            : "No delivery directly linked"}
                        </em>
                      </span>
                    </article>
                  </section>

                  <section className="approval-decision-control">
                    <header>
                      <div>
                        <span>
                          HUMAN DECISION
                        </span>

                        <h3>
                          Record accountable authority action
                        </h3>
                      </div>

                      <UserCheck />
                    </header>

                    {isPending(
                      selectedRecommendation,
                    ) ? (
                      <>
                        <label>
                          Decision note

                          <textarea
                            value={
                              comment
                            }
                            maxLength={
                              500
                            }
                            placeholder="Add operational conditions, rejection reason or requested changes..."
                            onChange={(
                              event,
                            ) =>
                              setComment(
                                event.target.value,
                              )
                            }
                          />

                          <small>
                            Required for Reject and Request changes · {comment.length}/500
                          </small>
                        </label>

                        {!canReview && (
                          <p className="approval-permission-note">
                            <ShieldCheck />

                            Only a Government Authority account can record this decision.
                          </p>
                        )}

                        <div className="approval-actions">
                          <button
                            type="button"
                            className="request-changes"
                            disabled={
                              !canReview ||
                              submitting !==
                                null
                            }
                            onClick={() =>
                              void submitDecision(
                                "CHANGES_REQUESTED",
                              )
                            }
                          >
                            <MessageSquareText />

                            {submitting ===
                            "CHANGES_REQUESTED"
                              ? "Recording..."
                              : "Request changes"}
                          </button>

                          <button
                            type="button"
                            className="reject"
                            disabled={
                              !canReview ||
                              submitting !==
                                null
                            }
                            onClick={() =>
                              void submitDecision(
                                "REJECTED",
                              )
                            }
                          >
                            <CircleX />

                            {submitting ===
                            "REJECTED"
                              ? "Recording..."
                              : "Reject action"}
                          </button>

                          <button
                            type="button"
                            className="approve"
                            disabled={
                              !canReview ||
                              submitting !==
                                null
                            }
                            onClick={() =>
                              void submitDecision(
                                "APPROVED",
                              )
                            }
                          >
                            <ShieldCheck />

                            {submitting ===
                            "APPROVED"
                              ? "Approving..."
                              : "Approve action"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        className={`approval-final-decision ${statusTone(
                          selectedRecommendation.status,
                        )}`}
                      >
                        {selectedRecommendation.status.toUpperCase() ===
                        "APPROVED" ? (
                          <CheckCircle2 />
                        ) : (
                          <CircleX />
                        )}

                        <span>
                          <small>
                            FINAL DECISION
                          </small>

                          <b>
                            {formatLabel(
                              selectedRecommendation.status,
                            )}

                            {selectedRecommendation.reviewedBy
                              ? ` by ${selectedRecommendation.reviewedBy.fullName}`
                              : ""}
                          </b>

                          <em>
                            {formatDate(
                              selectedRecommendation.reviewedAt,
                            )}
                          </em>
                        </span>
                      </div>
                    )}
                  </section>

                  <section className="approval-history">
                    <header>
                      <div>
                        <span>
                          DECISION HISTORY
                        </span>

                        <h3>
                          Immutable review trail
                        </h3>
                      </div>

                      <Clock3 />
                    </header>

                    <div>
                      {selectedRecommendation.decisions.map(
                        (
                          decision,
                        ) => (
                          <article
                            key={
                              decision.id
                            }
                          >
                            <i
                              className={decision.decision.toLowerCase()}
                            >
                              {decision.decision ===
                              "APPROVED" ? (
                                <CheckCircle2 />
                              ) : (
                                <CircleX />
                              )}
                            </i>

                            <span>
                              <b>
                                {formatLabel(
                                  decision.decision,
                                )}
                                {" · "}
                                {
                                  decision.actor.fullName
                                }
                              </b>

                              <small>
                                {decision.comment ??
                                  "Decision recorded without additional conditions."}
                              </small>
                            </span>

                            <time>
                              {formatDate(
                                decision.decidedAt,
                              )}
                            </time>
                          </article>
                        ),
                      )}

                      {selectedRecommendation.decisions.length ===
                        0 && (
                        <div className="approval-history-empty">
                          <Clock3 />

                          <span>
                            <b>
                              Awaiting first authority decision
                            </b>

                            <small>
                              A signed audit event will appear here after review.
                            </small>
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="approval-no-selection">
                  <ShieldCheck />

                  <h2>
                    Decision queue is clear
                  </h2>

                  <p>
                    New agent recommendations requiring authority will appear here.
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