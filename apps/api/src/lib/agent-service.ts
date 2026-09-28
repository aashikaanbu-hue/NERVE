import { env } from "../config/env.js";

export type SenseFieldEvidenceInput = {
  agentRunId: string;
  fieldReportId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  mediaUrls: string[];
  corridorId: string | null;
  roadSegmentId: string | null;
  incidentId: string | null;
  capturedAt: string;
};

export type SenseToolCall = {
  toolName: string;
  status: "SUCCEEDED";
  result: Record<string, unknown>;
};

export type SenseFieldEvidenceAnalysis = {
  agentRunId: string;
  fieldReportId: string;
  status: "COMPLETED";

  riskScore: number;

  riskLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

  confidence: number;
  evidenceSignals: string[];
  reasoning: string;
  recommendedAction: string;
  recommendationType: string;
  requiresApproval: boolean;
  nextAgent: string | null;
  toolCalls: SenseToolCall[];
  analysedAt: string;
};

export async function analyseFieldEvidence(
  input: SenseFieldEvidenceInput,
): Promise<SenseFieldEvidenceAnalysis> {
  const response = await fetch(
    `${env.agentServiceUrl}/api/v1/agents/sense/analyse-field-report`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(input),

      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const errorMessage =
      await response.text();

    throw new Error(
      `NERVE Sense failed with status ${response.status}: ` +
        errorMessage.slice(0, 300),
    );
  }

  const result =
    (await response.json()) as
      Partial<SenseFieldEvidenceAnalysis>;

  if (
    result.status !== "COMPLETED" ||
    typeof result.riskScore !== "number" ||
    typeof result.confidence !== "number" ||
    typeof result.reasoning !== "string" ||
    !Array.isArray(result.toolCalls)
  ) {
    throw new Error(
      "NERVE Sense returned an invalid analysis response.",
    );
  }

  return result as SenseFieldEvidenceAnalysis;
}
export type ForecastRiskLevel =
  | "NORMAL"
  | "WATCH"
  | "WARNING"
  | "CRITICAL";

export type CorridorForecastInput = {
  agentRunId: string;
  corridorId: string;
  corridorCode: string | null;
  corridorName: string;
  latitude: number;
  longitude: number;
  existingRiskScore: number;
  slopeSusceptibility: number;
};

export type CorridorForecastMetrics = {
  antecedentRainfall72hMm: number;
  forecastRainfall24hMm: number;
  forecastRainfall72hMm: number;
  maximumPrecipitationProbability: number;
  meanSurfaceSoilMoisture24h:
    | number
    | null;
  proactiveRiskScore: number;
  riskLevel: ForecastRiskLevel;
  rainfallTrend:
    | "INTENSIFYING"
    | "STEADY"
    | "EASING";
};

export type CorridorForecastToolCall = {
  toolName: string;

  status:
    | "SUCCEEDED"
    | "FAILED";

  result: Record<
    string,
    unknown
  >;
};

export type CorridorForecastAnalysis = {
  agentRunId: string;
  corridorId: string;
  corridorCode: string | null;
  corridorName: string;

  status: "COMPLETED";
  assessmentStatus:
    ForecastRiskLevel;

  source: string;
  methodology: string;

  metrics:
    CorridorForecastMetrics;

  riskFactors: string[];
  reasoning: string;
  recommendedAction: string;

  requiresApproval: boolean;
  automaticExecutionBlocked:
    boolean;

  nextAgent:
    | "IMPACT"
    | null;

  forecastStart: string;
  forecastEnd: string;
  generatedAt: string;

  limitations: string[];

  toolCalls:
    CorridorForecastToolCall[];
};

export async function analyseCorridorForecast(
  input: CorridorForecastInput,
): Promise<CorridorForecastAnalysis> {
  const response = await fetch(
    `${env.agentServiceUrl}/api/v1/agents/sense/forecast-corridor`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        input,
      ),

      signal:
        AbortSignal.timeout(
          20_000,
        ),
    },
  );

  if (!response.ok) {
    const errorMessage =
      await response.text();

    throw new Error(
      `NERVE Forecast failed with status ${response.status}: ` +
        errorMessage.slice(
          0,
          300,
        ),
    );
  }

  const result =
    (await response.json()) as
      Partial<{
        status: string;
        assessmentStatus:
          ForecastRiskLevel;
        source: string;

        metrics:
          Partial<
            CorridorForecastMetrics
          >;

        riskFactors:
          unknown[];

        toolCalls:
          unknown[];
      }> &
        Partial<
          CorridorForecastAnalysis
        >;

  if (
    result.status !==
      "COMPLETED" ||
    !result.metrics ||
    typeof result.metrics
      .forecastRainfall24hMm !==
      "number" ||
    typeof result.metrics
      .forecastRainfall72hMm !==
      "number" ||
    typeof result.metrics
      .proactiveRiskScore !==
      "number" ||
    !Array.isArray(
      result.riskFactors,
    ) ||
    !Array.isArray(
      result.toolCalls,
    )
  ) {
    throw new Error(
      "NERVE Forecast returned an invalid analysis response.",
    );
  }

  return result as
    CorridorForecastAnalysis;
}