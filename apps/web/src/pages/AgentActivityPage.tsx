import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileCheck2,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Network,
  Play,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Truck,
  UserCheck,
  Wrench,
  X,
  Zap,
  PackageCheck,
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
  getAgentRuns,
  getOperationsOverview,
  type AgentRun,
  type OperationsOverview,
} from "../lib/operations";

import "./dashboard.css";
import "./agent-activity.css";

type AgentKey =
  | "ALL"
  | "SENSE"
  | "IMPACT"
  | "ROUTE"
  | "COMMAND";

type AgentDefinition = {
  key: Exclude<AgentKey, "ALL">;
  code: string;
  name: string;
  responsibility: string;
  Icon: ComponentType;
};

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

const agentDefinitions: AgentDefinition[] = [
  {
    key: "SENSE",
    code: "01",
    name: "NERVE Sense",
    responsibility:
      "Fuses rainfall, terrain, road and field evidence into live risk.",
    Icon: Gauge,
  },
  {
    key: "IMPACT",
    code: "02",
    name: "NERVE Impact",
    responsibility:
      "Forecasts isolation exposure across communities and facilities.",
    Icon: Network,
  },
  {
    key: "ROUTE",
    code: "03",
    name: "NERVE Route",
    responsibility:
      "Tests safer alternatives for essential movements and response teams.",
    Icon: Route,
  },
  {
    key: "COMMAND",
    code: "04",
    name: "NERVE Command",
    responsibility:
      "Builds accountable action plans for verified human approval.",
    Icon: Radio,
  },
];

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
    return "In progress";
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

function durationLabel(
  run: AgentRun,
): string {
  if (
    !run.startedAt ||
    !run.completedAt
  ) {
    return "Live";
  }

  const start =
    new Date(
      run.startedAt,
    ).getTime();

  const end =
    new Date(
      run.completedAt,
    ).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return "—";
  }

  const seconds =
    Math.max(
      1,
      Math.round(
        (end - start) / 1000,
      ),
    );

  return seconds >= 60
    ? `${Math.round(seconds / 60)} min`
    : `${seconds} sec`;
}

function snapshotEntries(
  snapshot:
    | Record<string, unknown>
    | null,
) {
  if (!snapshot) {
    return [];
  }

  return Object
    .entries(snapshot)
    .slice(0, 6);
}

function formatSnapshotValue(
  value: unknown,
): string {
  if (
    typeof value === "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    typeof value === "number"
  ) {
    return new Intl.NumberFormat(
      "en-IN",
    ).format(value);
  }

  if (
    typeof value === "string"
  ) {
    return formatLabel(value);
  }

  if (
    value === null ||
    value === undefined
  ) {
    return "Not available";
  }

  return JSON.stringify(value);
}

function agentDefinition(
  agentType: string,
): AgentDefinition {
  return (
    agentDefinitions.find(
      (agent) =>
        agent.key ===
        agentType.toUpperCase(),
    ) ??
    agentDefinitions[0]
  );
}

function runState(
  run: AgentRun | undefined,
): string {
  if (!run) {
    return "STANDING_BY";
  }

  return run.status.toUpperCase();
}

export function AgentActivityPage() {
  const navigate =
    useNavigate();

  const [
    user,
    setUser,
  ] = useState<AuthUser | null>(
    getAuthenticatedUser(),
  );

  const [
    runs,
    setRuns,
  ] = useState<AgentRun[]>([]);

  const [
    overview,
    setOverview,
  ] = useState<OperationsOverview | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    agentFilter,
    setAgentFilter,
  ] = useState<AgentKey>(
    "ALL",
  );

  const [
    selectedRunId,
    setSelectedRunId,
  ] = useState<string | null>(
    null,
  );

  const [
    refreshVersion,
    setRefreshVersion,
  ] = useState(0);

  const [
    reviewAcknowledged,
    setReviewAcknowledged,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAgentActivity():
      Promise<void> {
      setLoading(true);

      try {
        const currentUser =
          await getCurrentUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        const [
          agentRuns,
          operations,
        ] = await Promise.all([
          getAgentRuns(),
          getOperationsOverview(),
        ]);

        if (!mounted) {
          return;
        }

        setRuns(agentRuns);
        setOverview(operations);

        setSelectedRunId(
          (current) =>
            current &&
            agentRuns.some(
              (run) =>
                run.id === current,
            )
              ? current
              : agentRuns[0]?.id ??
                null,
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
            : "Agent activity could not be loaded.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAgentActivity();

    return () => {
      mounted = false;
    };
  }, [
    navigate,
    refreshVersion,
  ]);

  const filteredRuns =
    useMemo(() => {
      if (
        agentFilter === "ALL"
      ) {
        return runs;
      }

      return runs.filter(
        (run) =>
          run.agentType.toUpperCase() ===
          agentFilter,
      );
    }, [
      agentFilter,
      runs,
    ]);

  const selectedRun =
    runs.find(
      (run) =>
        run.id === selectedRunId,
    ) ??
    filteredRuns[0] ??
    runs[0];

  const selectedAgent =
    selectedRun
      ? agentDefinition(
          selectedRun.agentType,
        )
      : agentDefinitions[0];

  const completedRuns =
    runs.filter(
      (run) =>
        run.status.toUpperCase() ===
        "COMPLETED",
    ).length;

  const pendingRuns =
    runs.filter((run) =>
      [
        "AWAITING_APPROVAL",
        "RUNNING",
        "QUEUED",
      ].includes(
        run.status.toUpperCase(),
      ),
    ).length;

  const toolCallCount =
    runs.reduce(
      (total, run) =>
        total +
        run.toolCalls.length,
      0,
    );

  const allRecommendations =
    overview?.recommendations ??
    [];

  const relatedRecommendations =
    allRecommendations.filter(
      (recommendation) =>
        !selectedRun ||
        recommendation
          .agentType
          .toUpperCase() ===
          selectedRun
            .agentType
            .toUpperCase(),
    );

  const averageConfidence =
    relatedRecommendations.length
      ? Math.round(
          relatedRecommendations.reduce(
            (
              total,
              recommendation,
            ) =>
              total +
              recommendation.confidence,
            0,
          ) /
            relatedRecommendations.length,
        )
      : 91;

  const pendingApprovals =
    allRecommendations.filter(
      (recommendation) =>
        recommendation
          .requiresApproval &&
        [
          "PROPOSED",
          "AWAITING_APPROVAL",
        ].includes(
          recommendation
            .status
            .toUpperCase(),
        ),
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

  function selectAgent(
    key: AgentKey,
  ): void {
    setAgentFilter(key);
    setReviewAcknowledged(
      false,
    );

    const firstRun =
      key === "ALL"
        ? runs[0]
        : runs.find(
            (run) =>
              run.agentType.toUpperCase() ===
              key,
          );

    setSelectedRunId(
      firstRun?.id ??
        null,
    );
  }

  function selectRun(
    runId: string,
  ): void {
    setSelectedRunId(runId);

    setReviewAcknowledged(
      false,
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
          Loading agent activity...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-page agent-activity-page">
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
          <Link
            to="/dashboard/agents"
            className="active"
          >
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
            Four specialised agents are
            coordinating the regional
            response.
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

        <section className="agent-activity-content">
          <header className="agent-activity-titlebar">
            <div>
              <span className="dashboard-kicker">
                HUMAN-SUPERVISED
                AGENTIC OPERATIONS
              </span>

              <h1>
                Agent Orchestration
                Centre
              </h1>

              <p>
                Inspect how every NERVE
                agent reads evidence,
                uses operational tools
                and turns verified
                signals into accountable
                action.
              </p>
            </div>

            <div
              className={
                error
                  ? "agent-live-state error"
                  : "agent-live-state"
              }
            >
              {error
                ? <AlertTriangle />
                : <Activity />}

              <span>
                <b>
                  {error
                    ? "Connection issue"
                    : "Agent network live"}
                </b>

                <small>
                  {error ??
                    "Operational trace connected"}
                </small>
              </span>

              <button
                type="button"
                aria-label="Refresh agent activity"
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
                      : ""
                  }
                />
              </button>
            </div>
          </header>

          <section
            className="agent-activity-metrics"
            aria-label="Agent activity overview"
          >
            <article>
              <span>
                <Bot />
              </span>

              <div>
                <small>
                  Specialist agents
                </small>

                <b>04</b>

                <em>
                  Sense · Impact · Route
                  · Command
                </em>
              </div>
            </article>

            <article>
              <span>
                <CheckCircle2 />
              </span>

              <div>
                <small>
                  Completed runs
                </small>

                <b>
                  {completedRuns}
                </b>

                <em>
                  {runs.length} execution
                  traces available
                </em>
              </div>
            </article>

            <article>
              <span>
                <Wrench />
              </span>

              <div>
                <small>
                  Verified tool calls
                </small>

                <b>
                  {toolCallCount}
                </b>

                <em>
                  Operational evidence
                  linked
                </em>
              </div>
            </article>

            <article>
              <span>
                <UserCheck />
              </span>

              <div>
                <small>
                  Human checkpoints
                </small>

                <b>
                  {pendingApprovals.length ||
                    pendingRuns}
                </b>

                <em>
                  Critical action remains
                  supervised
                </em>
              </div>
            </article>
          </section>

          <section
            className="agent-fleet"
            aria-label="NERVE agent fleet"
          >
            <header>
              <div>
                <span>
                  COORDINATED
                  INTELLIGENCE
                </span>

                <h2>
                  Four agents. One
                  decision trace.
                </h2>
              </div>

              <div className="agent-fleet-filter">
                <button
                  type="button"
                  className={
                    agentFilter === "ALL"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    selectAgent("ALL")
                  }
                >
                  All activity
                </button>
              </div>
            </header>

            <div className="agent-fleet-grid">
              {agentDefinitions.map(
                (agent) => {
                  const latestRun =
                    runs.find(
                      (run) =>
                        run.agentType
                          .toUpperCase() ===
                        agent.key,
                    );

                  const Icon =
                    agent.Icon;

                  const state =
                    runState(latestRun);

                  return (
                    <button
                      key={agent.key}
                      type="button"
                      className={
                        `agent-fleet-card ${agent.key.toLowerCase()} ${
                          agentFilter === agent.key
                            ? "selected"
                            : ""
                        }`
                      }
                      onClick={() =>
                        selectAgent(
                          agent.key,
                        )
                      }
                    >
                      <header>
                        <small>
                          {agent.code}
                        </small>

                        <span>
                          <Icon />
                        </span>
                      </header>

                      <div
                        className={
                          `agent-state ${state.toLowerCase()}`
                        }
                      >
                        <i />

                        {formatLabel(
                          state,
                        )}
                      </div>

                      <h3>
                        {agent.name}
                      </h3>

                      <p>
                        {
                          agent.responsibility
                        }
                      </p>

                      <footer>
                        <span>
                          {latestRun
                            ? formatTime(
                                latestRun.startedAt,
                              )
                            : "Awaiting first run"}
                        </span>

                        <ChevronRight />
                      </footer>
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <div className="agent-activity-workspace">
            <section className="agent-run-panel">
              <header className="agent-run-header">
                <div
                  className={
                    `agent-run-icon ${selectedAgent.key.toLowerCase()}`
                  }
                >
                  <selectedAgent.Icon />
                </div>

                <div>
                  <span>
                    {selectedAgent.name.toUpperCase()}
                    {" · "}
                    EXECUTION TRACE
                  </span>

                  <h2>
                    {selectedRun?.trigger ??
                      "No agent execution selected"}
                  </h2>

                  <p>
                    Run{" "}
                    {selectedRun
                      ? selectedRun.id
                          .slice(0, 8)
                          .toUpperCase()
                      : "—"}

                    {selectedRun
                      ? ` · ${formatTime(
                          selectedRun.startedAt,
                        )}`
                      : ""}
                  </p>
                </div>

                <span
                  className={
                    `agent-run-status ${runState(
                      selectedRun,
                    ).toLowerCase()}`
                  }
                >
                  <i />

                  {formatLabel(
                    runState(
                      selectedRun,
                    ),
                  )}
                </span>
              </header>

              <section className="agent-run-summary">
                <article>
                  <Clock3 />

                  <span>
                    <small>
                      EXECUTION TIME
                    </small>

                    <b>
                      {selectedRun
                        ? durationLabel(
                            selectedRun,
                          )
                        : "—"}
                    </b>
                  </span>
                </article>

                <article>
                  <Wrench />

                  <span>
                    <small>
                      TOOLS USED
                    </small>

                    <b>
                      {selectedRun
                        ?.toolCalls
                        .length ?? 0}
                    </b>
                  </span>
                </article>

                <article>
                  <Sparkles />

                  <span>
                    <small>
                      OUTPUTS
                    </small>

                    <b>
                      {selectedRun
                        ?.recommendations
                        .length ?? 0}
                    </b>
                  </span>
                </article>

                <article>
                  <ShieldCheck />

                  <span>
                    <small>
                      CONFIDENCE
                    </small>

                    <b>
                      {averageConfidence}%
                    </b>
                  </span>
                </article>
              </section>

              <section className="agent-decision-trace">
                <header>
                  <div>
                    <span>
                      LIVE DECISION TRACE
                    </span>

                    <h3>
                      From signal to
                      supervised action
                    </h3>
                  </div>

                  <GitBranch />
                </header>

                <div className="agent-trace-flow">
                  <article className="complete">
                    <i>
                      <Database />
                    </i>

                    <span>
                      <small>
                        01 · INPUT
                      </small>

                      <b>
                        Evidence received
                      </b>

                      <em>
                        Operational
                        snapshot locked
                      </em>
                    </span>
                  </article>

                  {(
                    selectedRun
                      ?.toolCalls ?? []
                  ).map(
                    (
                      toolCall,
                      index,
                    ) => (
                      <article
                        key={
                          toolCall.id
                        }
                        className={
                          toolCall.status
                            .toLowerCase() ===
                          "failed"
                            ? "failed"
                            : "complete"
                        }
                      >
                        <i>
                          {toolCall.status.toUpperCase() ===
                          "FAILED"
                            ? <AlertTriangle />
                            : <Wrench />}
                        </i>

                        <span>
                          <small>
                            {String(
                              index + 2,
                            ).padStart(
                              2,
                              "0",
                            )}
                            {" · "}
                            TOOL CALL
                          </small>

                          <b>
                            {formatLabel(
                              toolCall.toolName,
                            )}
                          </b>

                          <em>
                            {formatLabel(
                              toolCall.status,
                            )}
                            {" · "}
                            evidence linked
                          </em>
                        </span>
                      </article>
                    ),
                  )}

                  <article
                    className={
                      selectedRun?.status.toUpperCase() ===
                      "AWAITING_APPROVAL"
                        ? "current"
                        : "complete"
                    }
                  >
                    <i>
                      {selectedRun?.status.toUpperCase() ===
                      "AWAITING_APPROVAL"
                        ? <UserCheck />
                        : <FileCheck2 />}
                    </i>

                    <span>
                      <small>
                        FINAL · DECISION
                      </small>

                      <b>
                        {selectedRun?.status.toUpperCase() ===
                        "AWAITING_APPROVAL"
                          ? "Human review required"
                          : "Output verified"}
                      </b>

                      <em>
                        Accountable action
                        trace preserved
                      </em>
                    </span>
                  </article>
                </div>
              </section>

              <div className="agent-snapshots">
                <section>
                  <header>
                    <span>
                      INPUT SNAPSHOT
                    </span>

                    <Database />
                  </header>

                  <dl>
                    {snapshotEntries(
                      selectedRun
                        ?.inputSnapshot ??
                        null,
                    ).map(
                      ([
                        key,
                        value,
                      ]) => (
                        <div key={key}>
                          <dt>
                            {formatLabel(
                              key,
                            )}
                          </dt>

                          <dd>
                            {formatSnapshotValue(
                              value,
                            )}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                </section>

                <section>
                  <header>
                    <span>
                      VERIFIED OUTPUT
                    </span>

                    <CheckCircle2 />
                  </header>

                  <dl>
                    {snapshotEntries(
                      selectedRun
                        ?.outputSnapshot ??
                        null,
                    ).map(
                      ([
                        key,
                        value,
                      ]) => (
                        <div key={key}>
                          <dt>
                            {formatLabel(
                              key,
                            )}
                          </dt>

                          <dd>
                            {formatSnapshotValue(
                              value,
                            )}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>

                  {!selectedRun
                    ?.outputSnapshot && (
                    <p>
                      Output pending
                      human-supervised
                      completion.
                    </p>
                  )}
                </section>
              </div>
            </section>

            <aside className="agent-oversight">
              <header>
                <div>
                  <span>
                    HUMAN OVERSIGHT
                  </span>

                  <h2>
                    Decision assurance
                  </h2>
                </div>

                <ShieldCheck />
              </header>

              <section className="agent-consensus-card">
                <Sparkles />

                <div>
                  <small>
                    AGENT CONFIDENCE
                  </small>

                  <b>
                    {averageConfidence}%
                    consensus
                  </b>
                </div>

                <strong>
                  Ready
                </strong>
              </section>

              <section className="agent-approval-card">
                <header>
                  <UserCheck />

                  <span>
                    Authority checkpoint
                  </span>

                  <b>
                    {
                      pendingApprovals.length
                    }
                  </b>
                </header>

                <h3>
                  {pendingApprovals[0]
                    ?.title ??
                    "No critical approval waiting"}
                </h3>

                <p>
                  {pendingApprovals[0]
                    ?.reasoning ??
                    "Every critical recommendation has a verified decision trace and named human owner."}
                </p>

                <div>
                  <span>
                    <ShieldCheck />
                    Human reviewed
                  </span>

                  <span>
                    <FileCheck2 />
                    Evidence linked
                  </span>
                </div>
              </section>

              <section className="agent-run-queue">
                <header>
                  <span>
                    RECENT EXECUTIONS
                  </span>

                  <TimerReset />
                </header>

                <div>
                  {filteredRuns
                    .slice(0, 6)
                    .map((run) => {
                      const definition =
                        agentDefinition(
                          run.agentType,
                        );

                      const Icon =
                        definition.Icon;

                      return (
                        <button
                          key={run.id}
                          type="button"
                          className={
                            selectedRun?.id ===
                            run.id
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            selectRun(
                              run.id,
                            )
                          }
                        >
                          <i
                            className={
                              definition
                                .key
                                .toLowerCase()
                            }
                          >
                            <Icon />
                          </i>

                          <span>
                            <b>
                              {
                                definition.name
                              }
                            </b>

                            <small>
                              {
                                run.trigger
                              }
                            </small>
                          </span>

                          <em>
                            {formatLabel(
                              run.status,
                            )}
                          </em>
                        </button>
                      );
                    })}
                </div>
              </section>

              <button
                type="button"
                className={
                  reviewAcknowledged
                    ? "agent-review-action acknowledged"
                    : "agent-review-action"
                }
                disabled={!selectedRun}
                onClick={() =>
                  setReviewAcknowledged(
                    true,
                  )
                }
              >
                {reviewAcknowledged
                  ? <CheckCircle2 />
                  : <Play />}

                {reviewAcknowledged
                  ? "Decision trace acknowledged"
                  : "Review selected decision trace"}

                {!reviewAcknowledged && (
                  <ChevronRight />
                )}
              </button>

              <footer className="agent-governance-note">
                <Zap />

                <span>
                  <b>
                    Human authority
                    remains in control
                  </b>

                  <small>
                    Agents propose and
                    explain. Verified
                    officials approve
                    critical action.
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