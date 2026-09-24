import { createHash } from "node:crypto";

import {
  AgentRunStatus,
  AgentType,
  Prisma,
  ToolCallStatus,
  VerificationStatus,
  type AgentRun,
} from "@prisma/client";

import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

const senseResultSchema = z.object({
  agentRunId: z.string().uuid(),
  fieldReportId: z.string().uuid(),
  status: z.literal("COMPLETED"),
  riskScore: z.number().min(0).max(100),
  nextAgent: z.string().nullable(),
});

const count = z.number().int().nonnegative();

const impactResultSchema = z.object({
  agentRunId: z.string().uuid(),
  senseAgentRunId: z.string().uuid(),
  fieldReportId: z.string().uuid(),
  status: z.literal("COMPLETED"),

  assessmentStatus: z.enum([
    "ASSESSED",
    "PARTIAL",
    "INSUFFICIENT_DATA",
  ]),

  methodology: z.literal("corridor-dependency-scenario-v1"),
  affectedCorridorId: z.string().uuid().nullable(),

  communities: z.array(
    z.object({
      communityId: z.string().uuid(),
      name: z.string(),
      population: count.nullable(),
      criticalFacilityCount: count,

      assessment: z.enum([
        "NO_RECORDED_OPEN_ALTERNATIVE",
        "ALTERNATIVE_REQUIRES_REVIEW",
        "INSUFFICIENT_DATA",
      ]),

      candidateCorridorIds: z.array(z.string().uuid()),
      reasons: z.array(z.string()),
    }),
  ),

  metrics: z.object({
    communitiesReviewed: count,
    noRecordedOpenAlternative: count,
    alternativeRequiresReview: count,
    insufficientData: count,
    knownPopulationWithoutRecordedAlternative: count,
    unknownPopulationCommunitiesWithoutRecordedAlternative: count,
    facilitiesWithoutRecordedAlternative: count,
  }),

  reasoning: z.string(),
  recommendedAction: z.string(),

  recommendationType: z.enum([
    "PREPOSITION_SUPPLIES",
    "FIELD_VERIFICATION",
  ]),

  requiresApproval: z.literal(true),
  nextAgent: z.literal("ROUTE").nullable(),
  limitations: z.array(z.string()),

  toolCalls: z.array(
    z.object({
      toolName: z.enum([
        "assess_corridor_dependencies",
        "summarise_community_exposure",
      ]),
      status: z.literal("SUCCEEDED"),
      result: z.record(z.string(), z.unknown()),
    }),
  ).length(2),

  analysedAt: z.string().datetime({ offset: true }),
});

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

// Stable UUID v5: one Impact run per parent Sense run.
function impactIdFor(senseRunId: string): string {
  const bytes = createHash("sha1")
    .update(
      Buffer.from(
        senseRunId.replaceAll("-", ""),
        "hex",
      ),
    )
    .update("NERVE:IMPACT:v1")
    .digest();

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.subarray(0, 16).toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export async function processImpactAfterSense(
  senseRunId: string,
): Promise<AgentRun | null> {
  const senseRun = await prisma.agentRun.findUnique({
    where: { id: senseRunId },
  });

  if (
    !senseRun ||
    senseRun.agentType !== AgentType.SENSE ||
    senseRun.status !== AgentRunStatus.COMPLETED
  ) {
    throw new Error(
      "Impact requires a completed Sense run.",
    );
  }

  const sense = senseResultSchema.parse(
    senseRun.outputSnapshot,
  );

  const source = z.object({
    fieldReportId: z.string().uuid(),
  }).parse(senseRun.inputSnapshot);

  if (
    sense.agentRunId !== senseRun.id ||
    sense.fieldReportId !== source.fieldReportId
  ) {
    throw new Error(
      "Sense input and output identifiers do not match.",
    );
  }

  if (sense.nextAgent !== "IMPACT") {
    return null;
  }

  const id = impactIdFor(senseRun.id);

  const existing = await prisma.agentRun.upsert({
    where: { id },

    update: {
      trigger: "SENSE_COMPLETED",
    },

    create: {
      id,
      agentType: AgentType.IMPACT,
      status: AgentRunStatus.QUEUED,
      trigger: "SENSE_COMPLETED",

      inputSnapshot: {
        senseAgentRunId: senseRun.id,
        fieldReportId: sense.fieldReportId,
      },
    },
  });

  if (existing.status === AgentRunStatus.COMPLETED) {
    return existing;
  }

  // Only one caller can claim a queued or failed run.
  const claim = await prisma.agentRun.updateMany({
    where: {
      id,
      status: {
        in: [
          AgentRunStatus.QUEUED,
          AgentRunStatus.FAILED,
        ],
      },
    },

    data: {
      status: AgentRunStatus.RUNNING,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    },
  });

  if (claim.count === 0) {
    return prisma.agentRun.findUnique({
      where: { id },
    });
  }

  let requestSnapshot: Prisma.InputJsonValue = {
    senseAgentRunId: senseRun.id,
    fieldReportId: sense.fieldReportId,
  };

  let phase = "prepare_impact_context";

  try {
    const report = await prisma.fieldReport.findUnique({
      where: {
        id: sense.fieldReportId,
      },

      include: {
        roadSegment: true,
        incident: true,
      },
    });

    if (
      !report ||
      report.verificationStatus !== VerificationStatus.VERIFIED
    ) {
      throw new Error(
        "The source field report must still be verified.",
      );
    }

    const corridorIds = [
      report.corridorId,
      report.roadSegment?.corridorId,
      report.incident?.corridorId,
    ].filter(
      (value): value is string =>
        typeof value === "string",
    );

    if (new Set(corridorIds).size > 1) {
      throw new Error(
        "Report, road segment and incident corridor links disagree.",
      );
    }

    const affectedCorridorId = corridorIds[0] ?? null;

    const communities = affectedCorridorId
      ? await prisma.community.findMany({
          where: {
            corridorLinks: {
              some: {
                corridorId: affectedCorridorId,
              },
            },
          },

          include: {
            corridorLinks: {
              include: {
                corridor: true,
              },
            },

            _count: {
              select: {
                facilities: true,
              },
            },
          },

          orderBy: {
            id: "asc",
          },

          take: 1001,
        })
      : [];

    if (
      communities.length > 1000 ||
      communities.some(
        (community) =>
          community.corridorLinks.length > 100,
      )
    ) {
      throw new Error(
        "Impact input exceeds the supported size; no data was truncated.",
      );
    }

    const payload = {
      agentRunId: id,
      senseAgentRunId: senseRun.id,
      fieldReportId: report.id,
      senseRiskScore: sense.riskScore,
      affectedCorridorId,

      communities: communities.map((community) => ({
        id: community.id,
        name: community.name,
        population: community.population,
        criticalFacilityCount: community._count.facilities,

        corridors: community.corridorLinks.map(
          ({ corridor }) => ({
            id: corridor.id,
            status: corridor.status,
            riskScore: corridor.riskScore,
          }),
        ),
      })),
    };

    requestSnapshot = json(payload);

    await prisma.agentRun.update({
      where: { id },

      data: {
        inputSnapshot: requestSnapshot,
      },
    });

    phase = "call_impact_service";

    const response = await fetch(
      `${env.agentServiceUrl}/api/v1/agents/impact/analyse-connectivity`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Impact service returned HTTP ${response.status}.`,
      );
    }

    const analysis = impactResultSchema.parse(
      await response.json(),
    );

    const expectedIds = new Set(
      communities.map((community) => community.id),
    );

    const returnedIds = new Set(
      analysis.communities.map(
        (community) => community.communityId,
      ),
    );

    if (
      analysis.agentRunId !== id ||
      analysis.senseAgentRunId !== senseRun.id ||
      analysis.fieldReportId !== report.id ||
      analysis.affectedCorridorId !== affectedCorridorId ||
      analysis.communities.length !== communities.length ||
      returnedIds.size !== expectedIds.size ||
      [...returnedIds].some(
        (communityId) => !expectedIds.has(communityId),
      ) ||
      analysis.metrics.communitiesReviewed !== communities.length ||
      new Set(
        analysis.toolCalls.map((call) => call.toolName),
      ).size !== 2
    ) {
      throw new Error(
        "Impact response does not match its request.",
      );
    }

    phase = "persist_impact_result";

    return await prisma.$transaction(
      async (transaction) => {
        await transaction.agentToolCall.createMany({
          data: analysis.toolCalls.map((call) => ({
            agentRunId: id,
            toolName: call.toolName,
            status: ToolCallStatus.SUCCEEDED,
            request: requestSnapshot,
            response: json(call.result),
            completedAt: new Date(),
          })),
        });

        return transaction.agentRun.update({
          where: { id },

          data: {
            status: AgentRunStatus.COMPLETED,
            outputSnapshot: json(analysis),
            completedAt: new Date(),
            errorMessage: null,
          },
        });
      },
    );
  } catch (error) {
    const errorMessage = (
      error instanceof Error
        ? error.message
        : "Unknown Impact workflow error."
    ).slice(0, 2000);

    return prisma.$transaction(
      async (transaction) => {
        await transaction.agentToolCall.create({
          data: {
            agentRunId: id,
            toolName: phase,
            status: ToolCallStatus.FAILED,
            request: requestSnapshot,
            errorMessage,
            completedAt: new Date(),
          },
        });

        return transaction.agentRun.update({
          where: { id },

          data: {
            status: AgentRunStatus.FAILED,
            errorMessage,
            completedAt: new Date(),
          },
        });
      },
    );
  }
}