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
): Promise<Response> {
  let accessToken =
    getAccessToken();

  function createHeaders(
    token: string | null,
  ): Headers {
    const headers =
      new Headers();

    headers.set(
      "Accept",
      "application/json",
    );

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`,
      );
    }

    return headers;
  }

  let response = await fetch(
    `${API_URL}${path}`,
    {
      method: "GET",
      credentials: "include",

      headers:
        createHeaders(
          accessToken,
        ),
    },
  );

  if (response.status === 401) {
    accessToken =
      await refreshAccessToken();

    response = await fetch(
      `${API_URL}${path}`,
      {
        method: "GET",
        credentials: "include",

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