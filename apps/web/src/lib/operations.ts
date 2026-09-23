import {
  getAccessToken,
  refreshAccessToken,
} from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:4000/api/v1";

export type OperationsMetrics = {
  totalCorridors: number;
  criticalCorridors: number;
  totalSegments: number;
  accessibleSegments: number;
  accessibleNetworkPercent: number;
  communitiesAtRisk: number;
  activeDeliveries: number;
  criticalIncidents: number;
  pendingApprovals: number;
};

export type OverviewIncident = {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  riskScore: number;
  latitude: number | null;
  longitude: number | null;
  detectedAt: string;

  corridor: {
    id: string;
    code: string;
    name: string;
  } | null;

  roadSegment: {
    id: string;
    code: string;
    name: string;
  } | null;

  communityImpacts: Array<{
    impactLevel: string;

    estimatedIsolationHours:
      | number
      | null;

    estimatedPopulationAffected:
      | number
      | null;

    community: {
      id: string;
      code: string;
      name: string;
      accessStatus: string;
    };
  }>;
};

export type OverviewDelivery = {
  id: string;
  referenceNumber: string;
  cargoType: string;

  cargoDescription:
    | string
    | null;

  priority: string;
  status: string;

  quantity:
    | number
    | null;

  unit:
    | string
    | null;

  originName: string;

  currentLatitude:
    | number
    | null;

  currentLongitude:
    | number
    | null;

  plannedDepartureAt:
    | string
    | null;

  estimatedArrivalAt:
    | string
    | null;

  assignedDriver: {
    id: string;
    fullName: string;

    phone:
      | string
      | null;
  } | null;

  destinationCommunity: {
    id: string;
    code: string;
    name: string;
    accessStatus: string;
  };

  destinationFacility: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;

  corridor: {
    id: string;
    code: string;
    name: string;
    status: string;
    riskScore: number;
  } | null;
};

export type OverviewRecommendation = {
  id: string;
  agentType: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  reasoning: string;
  confidence: number;

  evidence:
    | Record<string, unknown>
    | null;

  proposedAction:
    | Record<string, unknown>
    | null;

  requiresApproval: boolean;

  reviewedAt:
    | string
    | null;

  expiresAt:
    | string
    | null;

  createdAt: string;

  corridor: {
    id: string;
    code: string;
    name: string;
  } | null;

  incident: {
    id: string;
    referenceNumber: string;
    title: string;
    severity: string;
  } | null;

  delivery: {
    id: string;
    referenceNumber: string;
    cargoType: string;
    status: string;
  } | null;
};
export type AgentToolCall = {
  id: string;
  agentRunId: string;
  toolName: string;
  status: string;
  request: Record<string, unknown>;
  response: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type AgentRunRecommendation = {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  confidence: number;
};

export type AgentRun = {
  id: string;
  agentType: string;
  status: string;
  trigger: string;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  toolCalls: AgentToolCall[];
  recommendations: AgentRunRecommendation[];
};
export type ApprovalDecision = {
  id: string;
  decision: string;
  comment: string | null;
  decidedAt: string;
  createdAt: string;

  actor: {
    id: string;
    fullName: string;
    role: string;
  };
};

export type ApprovalRecommendation = {
  id: string;
  agentType: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  reasoning: string;
  confidence: number;

  evidence:
    | Record<string, unknown>
    | null;

  proposedAction:
    | Record<string, unknown>
    | null;

  requiresApproval: boolean;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;

  agentRun: {
    id: string;
    agentType: string;
    status: string;
    trigger: string;
    startedAt: string | null;
    completedAt: string | null;
  } | null;

  corridor: {
    id: string;
    code: string;
    name: string;
    status: string;
    riskScore: number;
  } | null;

  roadSegment: {
    id: string;
    code: string;
    name: string;
    status: string;
    riskScore: number;
  } | null;

  incident: {
    id: string;
    referenceNumber: string;
    title: string;
    severity: string;
    status: string;
  } | null;

  delivery: {
    id: string;
    referenceNumber: string;
    cargoType: string;
    priority: string;
    status: string;
  } | null;

  reviewedBy: {
    id: string;
    fullName: string;
    role: string;
  } | null;

  decisions:
    ApprovalDecision[];
};
export type OperationalNotification = {
  id: string;
  userId: string;
  sourceRecommendationId: string | null;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  deliveredAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;

  sourceRecommendation: {
    id: string;
    agentType: string;
    type: string;
    priority: string;
    status: string;
    title: string;
    confidence: number;

    corridor: {
      id: string;
      code: string;
      name: string;
    } | null;

    incident: {
      id: string;
      referenceNumber: string;
      title: string;
      severity: string;
    } | null;

    delivery: {
      id: string;
      referenceNumber: string;
      cargoType: string;
      status: string;
    } | null;
  } | null;
};

export type NotificationFeed = {
  generatedAt: string;

  metrics: {
    total: number;
    unread: number;
    critical: number;
    acknowledged: number;
  };

  notifications: OperationalNotification[];
};
export type OperationsOverview = {
  generatedAt: string;
  metrics: OperationsMetrics;
  incidents: OverviewIncident[];
  deliveries: OverviewDelivery[];

  recommendations:
    OverviewRecommendation[];
};

type OperationsOverviewResponse = {
  data: OperationsOverview;
};
type AgentRunsResponse = {
  data: {
    total: number;
    runs: AgentRun[];
  };
};
type RecommendationsResponse = {
  data: {
    total: number;

    recommendations:
      ApprovalRecommendation[];
  };
};

type RecommendationDecisionResponse = {
  data: {
    recommendation:
      ApprovalRecommendation;
  };
};
type NotificationFeedResponse = {
  data: NotificationFeed;
};

type NotificationStatusResponse = {
  data: {
    notification: OperationalNotification;
  };
};

type ReadAllNotificationsResponse = {
  data: {
    updated: number;
  };
};
type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const result =
      (await response.json()) as ApiErrorResponse;

    return (
      result.error?.message ??
      "Operational data request failed."
    );
  } catch {
    return "Operational data request failed.";
  }
}

async function requestWithAuthentication(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let accessToken =
    getAccessToken();

  function createHeaders(
    token: string | null,
  ): Headers {
    const headers =
      new Headers(
        init.headers,
      );

    headers.set(
      "Accept",
      "application/json",
    );

    if (
      init.body &&
      !headers.has(
        "Content-Type",
      )
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }

    return headers;
  }

  let response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...init,

        method:
          init.method ??
          "GET",

        credentials:
          "include",

        headers:
          createHeaders(
            accessToken,
          ),
      },
    );

  if (
    response.status === 401
  ) {
    accessToken =
      await refreshAccessToken();

    response =
      await fetch(
        `${API_URL}${path}`,
        {
          ...init,

          method:
            init.method ??
            "GET",

          credentials:
            "include",

          headers:
            createHeaders(
              accessToken,
            ),
        },
      );
  }

  return response;
}

export async function getOperationsOverview():
  Promise<OperationsOverview> {
  const response =
    await requestWithAuthentication(
      "/operations/overview",
    );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as OperationsOverviewResponse;

  if (
    !result.data ||
    !result.data.metrics
  ) {
    throw new Error(
      "The operational API returned an invalid response.",
    );
  }

  return result.data;
}
export async function getAgentRuns(): Promise<AgentRun[]> {
  const response = await requestWithAuthentication(
    "/operations/agent-runs",
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as AgentRunsResponse;

  if (
    !result.data ||
    !Array.isArray(result.data.runs)
  ) {
    throw new Error(
      "The agent activity API returned an invalid response.",
    );
  }

  return result.data.runs;
}
export async function getRecommendations():
  Promise<ApprovalRecommendation[]> {
  const response =
    await requestWithAuthentication(
      "/operations/recommendations?limit=100",
    );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    );
  }

  const result =
    (await response.json()) as
      RecommendationsResponse;

  if (
    !result.data ||
    !Array.isArray(
      result.data.recommendations,
    )
  ) {
    throw new Error(
      "The approval queue API returned an invalid response.",
    );
  }

  return result.data.recommendations;
}

export async function reviewRecommendation(
  recommendationId: string,

  decision:
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED",

  comment?: string,
): Promise<ApprovalRecommendation> {
  const response =
    await requestWithAuthentication(
      `/operations/recommendations/${recommendationId}/decision`,

      {
        method:
          "POST",

        body:
          JSON.stringify({
            decision,

            ...(comment?.trim()
              ? {
                  comment:
                    comment.trim(),
                }
              : {}),
          }),
      },
    );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    );
  }

  const result =
    (await response.json()) as
      RecommendationDecisionResponse;

  if (
    !result.data
      ?.recommendation
  ) {
    throw new Error(
      "The approval decision API returned an invalid response.",
    );
  }

  return result.data.recommendation;
}
export async function getNotifications(
  status = "ALL",
): Promise<NotificationFeed> {
  const response = await requestWithAuthentication(
    `/notifications?status=${encodeURIComponent(status)}&limit=100`,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result =
    (await response.json()) as NotificationFeedResponse;

  if (
    !result.data ||
    !result.data.metrics ||
    !Array.isArray(result.data.notifications)
  ) {
    throw new Error(
      "The operational alerts API returned an invalid response.",
    );
  }

  return result.data;
}

export async function updateNotificationStatus(
  notificationId: string,
  status:
    | "UNREAD"
    | "READ"
    | "ACKNOWLEDGED"
    | "DISMISSED",
): Promise<OperationalNotification> {
  const response = await requestWithAuthentication(
    `/notifications/${notificationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result =
    (await response.json()) as NotificationStatusResponse;

  if (!result.data?.notification) {
    throw new Error(
      "The notification status API returned an invalid response.",
    );
  }

  return result.data.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await requestWithAuthentication(
    "/notifications/read-all",
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const result =
    (await response.json()) as ReadAllNotificationsResponse;

  if (typeof result.data?.updated !== "number") {
    throw new Error(
      "The notification bulk update API returned an invalid response.",
    );
  }

  return result.data.updated;
}
export type SupplyPriorityBand =
  | "P1"
  | "P2"
  | "P3"
  | "P4";

export type SupplyPriorityFactors = {
  cargoUrgency: number;
  shortageRisk: number;
  populationImpact: number;
  delayPressure: number;
  routeRisk: number;
  disasterSeverity: number;
  vehicleReadiness: number;
};

export type RankedSupplyDelivery = {
  rank: number;
  score: number;
  band: SupplyPriorityBand;
  label: string;
  recommendedAction: string;
  reasons: string[];
  factors: SupplyPriorityFactors;

  delivery: {
    id: string;
    referenceNumber: string;
    cargoType: string;
    cargoDescription: string | null;
    quantity: number | null;
    unit: string | null;
    priority: string;
    status: string;
    originName: string;
    plannedDepartureAt: string | null;
    estimatedArrivalAt: string | null;
  };

  destinationCommunity: {
    id: string;
    code: string;
    name: string;
    district: string;
    population: number | null;
    vulnerabilityScore: number;
    accessStatus: string;
  };

  destinationFacility: {
    id: string;
    code: string;
    name: string;
    type: string;
    operational: boolean;
    accessStatus: string;
  } | null;

  assignedDriver: {
    id: string;
    fullName: string;
    phone: string | null;
  } | null;

  corridor: {
    id: string;
    code: string;
    name: string;
    status: string;
    riskScore: number;
  } | null;

  activeIncident: {
    id: string;
    referenceNumber: string;
    title: string;
    severity: string;
    riskScore: number;
  } | null;
};

export type SupplyPriorityFeed = {
  generatedAt: string;

  metrics: {
    total: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };

  methodology: {
    cargoUrgency: number;
    shortageRisk: number;
    populationImpact: number;
    delayPressure: number;
    routeRisk: number;
    disasterSeverity: number;
    vehicleReadiness: number;
    maximumScore: number;
  };

  priorities: RankedSupplyDelivery[];
};

type SupplyPriorityResponse = {
  data: SupplyPriorityFeed;
};

export async function getSupplyPriorities():
  Promise<SupplyPriorityFeed> {
  const response =
    await requestWithAuthentication(
      "/supply-priorities",
    );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as
      SupplyPriorityResponse;

  if (
    !result.data ||
    !result.data.metrics ||
    !Array.isArray(
      result.data.priorities,
    )
  ) {
    throw new Error(
      "The supply priority engine returned an invalid response.",
    );
  }

  return result.data;
}