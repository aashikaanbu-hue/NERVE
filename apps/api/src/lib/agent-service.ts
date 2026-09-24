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