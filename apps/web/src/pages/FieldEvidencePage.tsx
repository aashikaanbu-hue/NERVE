import {
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudOff,
  FileCheck2,
  FileImage,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  PackageCheck,
  Radio,
  RefreshCw,
  Route,
  Satellite,
  ShieldCheck,
  Sparkles,
  Truck,
  UploadCloud,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getAuthenticatedUser,
  logout,
  type AuthUser,
  type UserRole,
} from "../lib/auth";

import {
  createFieldReport,
  getFieldReportCorridorOptions,
  getFieldReports,
  getFieldReportSummary,
  updateFieldReportVerification,
  type CreateFieldReportInput,
  type FieldReportCorridorOption,
  type FieldReportRecord,
  type FieldReportSummary,
  type FieldReportVerificationStatus,
} from "../lib/operations";

import "./dashboard.css";
import "./field-evidence.css";

type ReportFilter =
  | "ALL"
  | FieldReportVerificationStatus;

type StoredFieldDraft = {
  id: string;
  savedAt: string;
  input: CreateFieldReportInput;
};

type ReportFormState = {
  title: string;
  description: string;
  corridorId: string;
  latitude: string;
  longitude: string;
  mediaUrl: string;
};

const DRAFT_STORAGE_KEY =
  "nerve_field_evidence_drafts";

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

const emptySummary: FieldReportSummary = {
  total: 0,
  pending: 0,
  verified: 0,
  rejected: 0,
  withMedia: 0,
};

const initialForm: ReportFormState = {
  title: "",
  description: "",
  corridorId: "",
  latitude: "",
  longitude: "",
  mediaUrl: "",
};
function readDrafts(): StoredFieldDraft[] {
  try {
    const stored =
      window.localStorage.getItem(
        DRAFT_STORAGE_KEY,
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored) as unknown;

    return Array.isArray(parsed)
      ? (parsed as StoredFieldDraft[])
      : [];
  } catch {
    return [];
  }
}

function writeDrafts(
  drafts: StoredFieldDraft[],
): void {
  window.localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify(drafts),
  );
}

function createDraftId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}`;
}

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
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
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

function coordinateText(
  value: string | number,
): string {
  const coordinate = Number(value);

  if (Number.isNaN(coordinate)) {
    return "Unavailable";
  }

  return coordinate.toFixed(5);
}

function statusLabel(
  status: FieldReportVerificationStatus,
): string {
  const labels: Record<
    FieldReportVerificationStatus,
    string
  > = {
    PENDING: "Awaiting verification",
    VERIFIED: "Verified evidence",
    REJECTED: "Evidence rejected",
  };

  return labels[status];
}

export function FieldEvidencePage() {
  const navigate = useNavigate();

  const [
    user,
  ] = useState<AuthUser | null>(
    getAuthenticatedUser(),
  );

  const [
    reports,
    setReports,
  ] = useState<FieldReportRecord[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<FieldReportSummary>(
      emptySummary,
    );

  const [
    selectedReportId,
    setSelectedReportId,
  ] = useState<string | null>(null);

  const [
    filter,
    setFilter,
  ] =
    useState<ReportFilter>("ALL");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    syncing,
    setSyncing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] =
    useState<ReportFormState>(
      initialForm,
    );
    const [
    corridors,
    setCorridors,
  ] = useState<
    FieldReportCorridorOption[]
  >([]);

  const [
    drafts,
    setDrafts,
  ] =
    useState<StoredFieldDraft[]>(
      () => readDrafts(),
    );

  const [
    isOnline,
    setIsOnline,
  ] = useState(
    typeof navigator === "undefined"
      ? true
      : navigator.onLine,
  );

  const selectedReport =
    useMemo(
      () =>
        reports.find(
          (report) =>
            report.id ===
            selectedReportId,
        ) ??
        reports[0] ??
        null,
      [reports, selectedReportId],
    );
  async function loadCorridors():
    Promise<void> {
    try {
      const corridorOptions =
        await getFieldReportCorridorOptions();

      setCorridors(corridorOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Corridor options could not be loaded.",
      );
    }
  }
  async function loadReports(
    nextFilter: ReportFilter = filter,
  ): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const [
        reportFeed,
        reportSummary,
      ] = await Promise.all([
        getFieldReports(nextFilter),
        getFieldReportSummary(),
      ]);

      setReports(reportFeed.reports);
      setSummary(reportSummary);

      setSelectedReportId(
        (currentId) => {
          const stillExists =
            reportFeed.reports.some(
              (report) =>
                report.id ===
                currentId,
            );

          if (stillExists) {
            return currentId;
          }

          return (
            reportFeed.reports[0]
              ?.id ?? null
          );
        },
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Field evidence could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    void loadReports("ALL");
        void loadCorridors();
  }, [navigate, user]);

  useEffect(() => {
    function handleOnline(): void {
      setIsOnline(true);
      setNotice(
        "Connection restored. Offline reports are ready to sync.",
      );
    }

    function handleOffline(): void {
      setIsOnline(false);
      setNotice(
        "You are offline. New evidence will be saved safely on this device.",
      );
    }

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, []);

  async function handleLogout():
    Promise<void> {
    await logout();

    navigate("/login", {
      replace: true,
    });
  }

  function updateForm(
    field: keyof ReportFormState,
    value: string,
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildReportInput():
    CreateFieldReportInput | null {
    const latitude =
      Number(form.latitude);

    const longitude =
      Number(form.longitude);

    if (
      form.title.trim().length < 3
    ) {
      setError(
        "Enter a clear evidence title.",
      );
      return null;
    }

    if (
      form.description.trim().length <
      10
    ) {
      setError(
        "Describe what was observed in at least 10 characters.",
      );
      return null;
    }

    if (
      Number.isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setError(
        "Enter a valid latitude between -90 and 90.",
      );
      return null;
    }

    if (
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Enter a valid longitude between -180 and 180.",
      );
      return null;
    }

    return {
      title: form.title.trim(),
      description:
        form.description.trim(),
      corridorId:
        form.corridorId || null,
      latitude,
      longitude,
      mediaUrls: form.mediaUrl.trim()
        ? [form.mediaUrl.trim()]
        : [],
      capturedAt:
        new Date().toISOString(),
    };
  }

  function storeOfflineDraft(
    input: CreateFieldReportInput,
  ): void {
    const nextDraft: StoredFieldDraft = {
      id: createDraftId(),
      savedAt:
        new Date().toISOString(),
      input,
    };

    const nextDrafts = [
      nextDraft,
      ...drafts,
    ];

    writeDrafts(nextDrafts);
    setDrafts(nextDrafts);
    setForm(initialForm);
    setFormOpen(false);
    setError("");

    setNotice(
      "Evidence saved offline. It will remain on this device until synced.",
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const input = buildReportInput();

    if (!input) {
      return;
    }

    if (!isOnline) {
      storeOfflineDraft(input);
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const createdReport =
        await createFieldReport(input);

      setForm(initialForm);
      setFormOpen(false);
      setNotice(
        "Field evidence synced successfully and is awaiting verification.",
      );

      await loadReports(filter);

      setSelectedReportId(
        createdReport.id,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The report could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function captureLocation(): void {
    setError("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Location access is not supported by this browser.",
      );
      return;
    }

    setNotice(
      "Reading the current device location...",
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude:
            position.coords.latitude.toFixed(
              6,
            ),
          longitude:
            position.coords.longitude.toFixed(
              6,
            ),
        }));

        setNotice(
          "Current GPS coordinates captured.",
        );
      },

      () => {
        setError(
          "Location permission was denied. Enter the coordinates manually.",
        );
        setNotice("");
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async function syncOfflineDrafts():
    Promise<void> {
    if (!isOnline) {
      setError(
        "Connect to the internet before syncing offline evidence.",
      );
      return;
    }

    if (drafts.length === 0) {
      setNotice(
        "There are no offline reports waiting to sync.",
      );
      return;
    }

    setSyncing(true);
    setError("");
    setNotice("");

    const failedDrafts:
      StoredFieldDraft[] = [];

    let syncedCount = 0;

    for (const draft of drafts) {
      try {
        await createFieldReport(
          draft.input,
        );

        syncedCount += 1;
      } catch {
        failedDrafts.push(draft);
      }
    }

    writeDrafts(failedDrafts);
    setDrafts(failedDrafts);
    setSyncing(false);

    if (syncedCount > 0) {
      setNotice(
        `${syncedCount} offline report${syncedCount === 1 ? "" : "s"} synced successfully.`,
      );

      await loadReports(filter);
    }

    if (failedDrafts.length > 0) {
      setError(
        `${failedDrafts.length} report${failedDrafts.length === 1 ? "" : "s"} could not be synced and remain safely stored.`,
      );
    }
  }

  async function changeFilter(
    nextFilter: ReportFilter,
  ): Promise<void> {
    setFilter(nextFilter);
    await loadReports(nextFilter);
  }

  async function verifyReport(
    status:
      | "VERIFIED"
      | "REJECTED",
  ): Promise<void> {
    if (!selectedReport) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await updateFieldReportVerification(
        selectedReport.id,
        status,
      );

      setNotice(
        status === "VERIFIED"
          ? "Evidence verified. It is ready for agent risk fusion."
          : "Evidence rejected and removed from the trusted signal set.",
      );

      await loadReports(filter);
    } catch (verificationError) {
      setError(
        verificationError instanceof
          Error
          ? verificationError.message
          : "The verification decision could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const initials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "N";

  return (
    <div className="field-evidence-page">
      <div
        className={`field-mobile-overlay ${
          sidebarOpen ? "visible" : ""
        }`}
        onClick={() =>
          setSidebarOpen(false)
        }
      />

      <aside
        className={`field-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="field-sidebar-brand">
          <img
            src="/brand/nerve-logo-clean.png"
            alt="NERVE"
          />

          <button
            type="button"
            className="field-sidebar-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close navigation"
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
            to="/dashboard/field-evidence"
            className="active"
          >
            <Camera />
            Field evidence

            {drafts.length > 0 && (
              <span className="field-nav-count">
                {drafts.length}
              </span>
            )}
          </Link>

          <Link to="/dashboard/agents">
            <Bot />
            Agent activity
          </Link>
        </nav>

        <div className="field-sidebar-status">
          <span
            className={
              isOnline
                ? "online"
                : "offline"
            }
          >
            {isOnline ? (
              <Wifi />
            ) : (
              <WifiOff />
            )}
          </span>

          <div>
            <strong>
              {isOnline
                ? "Field channel online"
                : "Offline capture active"}
            </strong>

            <p>
              {isOnline
                ? "Evidence can be synced to the operational database."
                : "Reports remain safely stored on this device."}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="field-signout"
          onClick={() =>
            void handleLogout()
          }
        >
          <LogOut />
          Sign out
        </button>
      </aside>

      <div className="field-workspace">
        <header className="field-topbar">
          <button
            type="button"
            className="field-menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open navigation"
          >
            <Menu />
          </button>

          <div className="field-role">
            <strong>
              {user
                ? roleLabels[user.role]
                : "NERVE Operator"}
            </strong>

            <span>
              East Khasi Hills Pilot
            </span>
          </div>

          <div className="field-user">
            <Link
              to="/dashboard/notifications"
              className="field-alert-button"
              aria-label="Operational alerts"
            >
              <Bell />
            </Link>

            <span className="field-avatar">
              {initials}
            </span>

            <div>
              <strong>
                {user?.fullName ??
                  "NERVE Operator"}
              </strong>

              <span>
                {user?.email ??
                  "operations@nerve.gov.in"}
              </span>
            </div>
          </div>
        </header>

        <main className="field-main">
          <section className="field-hero">
            <div>
              <span className="field-eyebrow">
                TRUSTED GROUND INTELLIGENCE
              </span>

              <h1>
                Field Evidence Centre
              </h1>

              <p>
                Capture geo-tagged road
                conditions, preserve reports
                during weak connectivity and
                feed verified evidence into
                NERVE agent decisions.
              </p>
            </div>

            <div className="field-hero-actions">
              <div
                className={`field-network-card ${
                  isOnline
                    ? "connected"
                    : "disconnected"
                }`}
              >
                {isOnline ? (
                  <Radio />
                ) : (
                  <CloudOff />
                )}

                <div>
                  <strong>
                    {isOnline
                      ? "Evidence channel live"
                      : "Low-network mode"}
                  </strong>

                  <span>
                    {drafts.length} offline{" "}
                    {drafts.length === 1
                      ? "draft"
                      : "drafts"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="field-primary-button"
                onClick={() =>
                  setFormOpen(true)
                }
              >
                <Camera />
                Capture evidence
              </button>
            </div>
          </section>

          {(error || notice) && (
            <section
              className={`field-message ${
                error ? "error" : "success"
              }`}
            >
              {error ? (
                <CircleAlert />
              ) : (
                <CheckCircle2 />
              )}

              <span>
                {error || notice}
              </span>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
                aria-label="Dismiss message"
              >
                <X />
              </button>
            </section>
          )}

          <section className="field-metrics">
            <article>
              <span className="field-metric-icon blue">
                <Satellite />
              </span>

              <div>
                <span>Total reports</span>
                <strong>
                  {summary.total}
                </strong>
                <p>
                  Ground signals received
                </p>
              </div>
            </article>

            <article>
              <span className="field-metric-icon orange">
                <RefreshCw />
              </span>

              <div>
                <span>
                  Awaiting verification
                </span>
                <strong>
                  {summary.pending}
                </strong>
                <p>
                  Human review required
                </p>
              </div>
            </article>

            <article>
              <span className="field-metric-icon green">
                <FileCheck2 />
              </span>

              <div>
                <span>
                  Verified evidence
                </span>
                <strong>
                  {summary.verified}
                </strong>
                <p>
                  Trusted agent inputs
                </p>
              </div>
            </article>

            <article>
              <span className="field-metric-icon violet">
                <FileImage />
              </span>

              <div>
                <span>
                  Media attached
                </span>
                <strong>
                  {summary.withMedia}
                </strong>
                <p>
                  Photo or video references
                </p>
              </div>
            </article>
          </section>

          <section className="field-content-grid">
            <aside className="field-feed-panel">
              <header>
                <div>
                  <span className="field-section-label">
                    LIVE FIELD FEED
                  </span>

                  <h2>
                    Evidence queue
                  </h2>
                </div>

                <span className="field-feed-count">
                  {reports.length}
                </span>
              </header>

              <div className="field-filters">
                {(
                  [
                    "ALL",
                    "PENDING",
                    "VERIFIED",
                    "REJECTED",
                  ] as ReportFilter[]
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
                      void changeFilter(
                        item,
                      )
                    }
                  >
                    {formatText(item)}
                  </button>
                ))}
              </div>

              {drafts.length > 0 && (
                <div className="field-offline-queue">
                  <div>
                    <CloudOff />

                    <span>
                      <strong>
                        {drafts.length} offline{" "}
                        {drafts.length === 1
                          ? "report"
                          : "reports"}
                      </strong>

                      <small>
                        Stored safely on this
                        device
                      </small>
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !isOnline || syncing
                    }
                    onClick={() =>
                      void syncOfflineDrafts()
                    }
                  >
                    <UploadCloud />
                    {syncing
                      ? "Syncing..."
                      : "Sync now"}
                  </button>
                </div>
              )}

              <div className="field-report-list">
                {loading ? (
                  <div className="field-empty">
                    <RefreshCw className="spin" />
                    <strong>
                      Loading field evidence
                    </strong>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="field-empty">
                    <Camera />
                    <strong>
                      No reports in this view
                    </strong>
                    <p>
                      Capture new ground
                      evidence or select a
                      different filter.
                    </p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <button
                      type="button"
                      key={report.id}
                      className={`field-report-card ${
                        selectedReport?.id ===
                        report.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedReportId(
                          report.id,
                        )
                      }
                    >
                      <span
                        className={`field-report-symbol ${report.verificationStatus.toLowerCase()}`}
                      >
                        <MapPin />
                      </span>

                      <span className="field-report-copy">
                        <small>
                          {statusLabel(
                            report.verificationStatus,
                          )}
                        </small>

                        <strong>
                          {report.title}
                        </strong>

                        <span>
                          {formatDate(
                            report.capturedAt,
                          )}
                        </span>
                      </span>

                      <ChevronRight />
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="field-detail-panel">
              {!selectedReport ? (
                <div className="field-detail-empty">
                  <Satellite />
                  <h2>
                    Ground evidence will
                    appear here
                  </h2>
                  <p>
                    Select a report or capture
                    new field information.
                  </p>
                </div>
              ) : (
                <>
                  <header className="field-detail-header">
                    <span
                      className={`field-detail-icon ${selectedReport.verificationStatus.toLowerCase()}`}
                    >
                      <Camera />
                    </span>

                    <div>
                      <span className="field-section-label">
                        GEO-TAGGED FIELD REPORT
                      </span>

                      <h2>
                        {selectedReport.title}
                      </h2>

                      <p>
                        Captured{" "}
                        {formatDate(
                          selectedReport.capturedAt,
                        )}
                      </p>
                    </div>

                    <span
                      className={`field-status-pill ${selectedReport.verificationStatus.toLowerCase()}`}
                    >
                      {statusLabel(
                        selectedReport.verificationStatus,
                      )}
                    </span>
                  </header>

                  <div className="field-detail-stats">
                    <article>
                      <MapPin />
                      <span>
                        <small>Latitude</small>
                        <strong>
                          {coordinateText(
                            selectedReport.latitude,
                          )}
                        </strong>
                      </span>
                    </article>

                    <article>
                      <LocateFixed />
                      <span>
                        <small>Longitude</small>
                        <strong>
                          {coordinateText(
                            selectedReport.longitude,
                          )}
                        </strong>
                      </span>
                    </article>

                    <article>
                      <FileImage />
                      <span>
                        <small>
                          Media evidence
                        </small>
                        <strong>
                          {
                            selectedReport
                              .mediaUrls.length
                          }{" "}
                          linked
                        </strong>
                      </span>
                    </article>

                    <article>
                      <ShieldCheck />
                      <span>
                        <small>
                          Trust state
                        </small>
                        <strong>
                          {formatText(
                            selectedReport.verificationStatus,
                          )}
                        </strong>
                      </span>
                    </article>
                  </div>

                  <div className="field-observation">
                    <div>
                      <span className="field-section-label">
                        FIELD OBSERVATION
                      </span>

                      <h3>
                        What the official
                        observed
                      </h3>
                    </div>

                    <p>
                      {
                        selectedReport.description
                      }
                    </p>
                  </div>

                  <div className="field-context-grid">
                    <article>
                      <span>
                        <Route />
                      </span>

                      <div>
                        <small>
                          Linked corridor
                        </small>
                        <strong>
                          {selectedReport
                            .corridor?.name ??
                            "Location evidence only"}
                        </strong>
                        <p>
                          {selectedReport
                            .corridor
                            ? `${selectedReport.corridor.code} · ${formatText(selectedReport.corridor.status)}`
                            : "Can be linked during verification"}
                        </p>
                      </div>
                    </article>

                    <article>
                      <span>
                        <AlertTriangle />
                      </span>

                      <div>
                        <small>
                          Linked incident
                        </small>
                        <strong>
                          {selectedReport
                            .incident?.title ??
                            "No incident linked"}
                        </strong>
                        <p>
                          {selectedReport
                            .incident
                            ?.referenceNumber ??
                            "Agent correlation pending"}
                        </p>
                      </div>
                    </article>
                  </div>

                  <section className="field-agent-pipeline">
                    <header>
                      <div>
                        <span className="field-section-label">
                          AGENTIC EVIDENCE FLOW
                        </span>

                        <h3>
                          From ground signal
                          to accountable action
                        </h3>
                      </div>

                      <Sparkles />
                    </header>

                    <div className="field-agent-steps">
                      <article className="complete">
                        <span>01</span>
                        <Satellite />
                        <strong>
                          Evidence received
                        </strong>
                        <small>
                          Location and observation
                          locked
                        </small>
                      </article>

                      <article
                        className={
                          selectedReport.verificationStatus ===
                          "VERIFIED"
                            ? "complete"
                            : "current"
                        }
                      >
                        <span>02</span>
                        <ShieldCheck />
                        <strong>
                          Human verification
                        </strong>
                        <small>
                          Trust checkpoint
                        </small>
                      </article>

                      <article
                        className={
                          selectedReport.verificationStatus ===
                          "VERIFIED"
                            ? "current"
                            : ""
                        }
                      >
                        <span>03</span>
                        <Bot />
                        <strong>
                          Agent risk fusion
                        </strong>
                        <small>
                          Sense and Impact analysis
                        </small>
                      </article>

                      <article>
                        <span>04</span>
                        <Radio />
                        <strong>
                          Operational action
                        </strong>
                        <small>
                          Route, delivery or alert
                        </small>
                      </article>
                    </div>
                  </section>

                  {user?.role ===
                    "GOVERNMENT_AUTHORITY" &&
                    selectedReport.verificationStatus ===
                      "PENDING" && (
                      <footer className="field-review-actions">
                        <button
                          type="button"
                          className="reject"
                          disabled={submitting}
                          onClick={() =>
                            void verifyReport(
                              "REJECTED",
                            )
                          }
                        >
                          <X />
                          Reject evidence
                        </button>

                        <button
                          type="button"
                          className="verify"
                          disabled={submitting}
                          onClick={() =>
                            void verifyReport(
                              "VERIFIED",
                            )
                          }
                        >
                          <CheckCircle2 />
                          Verify evidence
                        </button>
                      </footer>
                    )}
                </>
              )}
            </section>
          </section>
        </main>
      </div>

      {formOpen && (
        <div className="field-modal-layer">
          <div
            className="field-modal-backdrop"
            onClick={() =>
              setFormOpen(false)
            }
          />

          <section className="field-report-modal">
            <header>
              <div>
                <span className="field-section-label">
                  NEW GROUND SIGNAL
                </span>

                <h2>
                  Capture field evidence
                </h2>

                <p>
                  The report will be stored
                  offline automatically if the
                  network is unavailable.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                aria-label="Close report form"
              >
                <X />
              </button>
            </header>

            <form
              onSubmit={(event) =>
                void handleSubmit(event)
              }
            >
              <label>
                Evidence title
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    updateForm(
                      "title",
                      event.target.value,
                    )
                  }
                  placeholder="Example: Fresh road crack near Mawmluh"
                  maxLength={160}
                  required
                />
              </label>

              <label>
                Field observation
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Describe the road condition, visible hazard and access impact..."
                  rows={5}
                  maxLength={2000}
                  required
                />
              </label>
                                  <label>
                Linked corridor
                <select
                  value={form.corridorId}
                  onChange={(event) =>
                    updateForm(
                      "corridorId",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select corridor for automated impact assessment
                  </option>

                  {corridors.map(
                    (corridor) => (
                      <option
                        key={corridor.id}
                        value={corridor.id}
                      >
                        {corridor.code} ·{" "}
                        {corridor.name} ·{" "}
                        {corridor.communityCount}{" "}
                        communities
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="field-location-inputs">
                <label>
                  Latitude
                  <input
                    type="number"
                    value={form.latitude}
                    onChange={(event) =>
                      updateForm(
                        "latitude",
                        event.target.value,
                      )
                    }
                    placeholder="25.578800"
                    step="0.000001"
                    min="-90"
                    max="90"
                    required
                  />
                </label>

                <label>
                  Longitude
                  <input
                    type="number"
                    value={form.longitude}
                    onChange={(event) =>
                      updateForm(
                        "longitude",
                        event.target.value,
                      )
                    }
                    placeholder="91.893300"
                    step="0.000001"
                    min="-180"
                    max="180"
                    required
                  />
                </label>
              </div>

              <button
                type="button"
                className="field-location-button"
                onClick={captureLocation}
              >
                <LocateFixed />
                Use current device location
              </button>

              <label>
                Photo or video evidence URL
                <input
                  type="text"
                  value={form.mediaUrl}
                  onChange={(event) =>
                    updateForm(
                      "mediaUrl",
                      event.target.value,
                    )
                  }
                  placeholder="Optional evidence link"
                  maxLength={2048}
                />
              </label>

              <div className="field-capture-note">
                {isOnline ? (
                  <Wifi />
                ) : (
                  <WifiOff />
                )}

                <p>
                  <strong>
                    {isOnline
                      ? "Online submission"
                      : "Offline-safe submission"}
                  </strong>

                  <span>
                    {isOnline
                      ? "The report will be written to the operational database."
                      : "The report will be stored locally until connectivity returns."}
                  </span>
                </p>
              </div>

              <footer>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setFormOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={submitting}
                >
                  {isOnline ? (
                    <UploadCloud />
                  ) : (
                    <CloudOff />
                  )}

                  {submitting
                    ? "Submitting..."
                    : isOnline
                      ? "Submit evidence"
                      : "Save offline"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}