import { createHash } from "node:crypto";

import {
  AgentRunStatus,
  AgentType,
  DeliveryStatus,
  Prisma,
  ToolCallStatus,
  type AgentRun,
} from "@prisma/client";

import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

const count =
  z.number().int().nonnegative();

const impactOutputSchema = z.object({
  agentRunId: z.string().uuid(),
  status: z.literal("COMPLETED"),
  affectedCorridorId:
    z.string().uuid(),
  nextAgent:
    z.literal("ROUTE").nullable(),

  metrics: z.object({
    noRecordedOpenAlternative:
      count,

    knownPopulationWithoutRecordedAlternative:
      count,
  }),
});

const routeResultSchema = z.object({
  agentRunId: z.string().uuid(),
  impactAgentRunId:
    z.string().uuid(),
  affectedCorridorId:
    z.string().uuid(),

  status:
    z.literal("COMPLETED"),

  assessmentStatus: z.enum([
    "ASSESSED",
    "PARTIAL",
    "INSUFFICIENT_DATA",
  ]),

  methodology:
    z.literal(
      "recorded-route-screen-v1",
    ),

  decisions: z.array(
    z.object({
      deliveryId:
        z.string().uuid(),

      referenceNumber:
        z.string(),

      action: z.enum([
        "RECOMMEND_RECORDED_ROUTE",
        "HOLD_FOR_ROUTE_VERIFICATION",
      ]),

      selectedRoutePlanId:
        z.string().uuid().nullable(),

      selectedRouteName:
        z.string().nullable(),

      selectedRiskScore:
        z.number()
          .min(0)
          .max(100)
          .nullable(),

      riskReduction:
        z.number()
          .nonnegative()
          .nullable(),

      reasons:
        z.array(z.string()),
    }),
  ),

  metrics: z.object({
    deliveriesReviewed:
      count,

    routeCandidatesReviewed:
      count,

    routesRecommended:
      count,

    deliveryHolds:
      count,
  }),

  reasoning:
    z.string(),

  recommendedAction:
    z.string(),

  recommendationType: z.enum([
    "ROUTE_CHANGE",
    "DELIVERY_HOLD",
    "FIELD_VERIFICATION",
  ]),

  requiresApproval:
    z.literal(true),

  nextAgent:
    z.literal("COMMAND").nullable(),

  limitations:
    z.array(z.string()),

  toolCalls: z.array(
    z.object({
      toolName: z.enum([
        "read_recorded_route_plans",
        "screen_lower_risk_routes",
      ]),

      status:
        z.literal("SUCCEEDED"),

      result:
        z.record(
          z.string(),
          z.unknown(),
        ),
    }),
  ).length(2),

  analysedAt:
    z.string().datetime({
      offset: true,
    }),
});

function json(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function routeIdFor(
  impactRunId: string,
): string {
  const bytes =
    createHash("sha1")
      .update(
        Buffer.from(
          impactRunId.replaceAll(
            "-",
            "",
          ),
          "hex",
        ),
      )
      .update(
        "NERVE:ROUTE:v1",
      )
      .digest();

  bytes[6] =
    (bytes[6] & 0x0f) | 0x50;

  bytes[8] =
    (bytes[8] & 0x3f) | 0x80;

  const hex =
    bytes
      .subarray(0, 16)
      .toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export async function processRouteAfterImpact(
  impactRunId: string,
): Promise<AgentRun | null> {
  const impactRun =
    await prisma.agentRun.findUnique({
      where: {
        id: impactRunId,
      },
    });

  if (
    !impactRun ||
    impactRun.agentType !==
      AgentType.IMPACT ||
    impactRun.status !==
      AgentRunStatus.COMPLETED
  ) {
    throw new Error(
      "Route requires a completed Impact run.",
    );
  }

  const impact =
    impactOutputSchema.parse(
      impactRun.outputSnapshot,
    );

  if (
    impact.agentRunId !==
    impactRun.id
  ) {
    throw new Error(
      "Impact output does not match its run.",
    );
  }

  if (
    impact.nextAgent !== "ROUTE"
  ) {
    return null;
  }

  const id =
    routeIdFor(impactRun.id);

  const existing =
    await prisma.agentRun.upsert({
      where: {
        id,
      },

      update: {
        trigger:
          "IMPACT_COMPLETED",
      },

      create: {
        id,

        agentType:
          AgentType.ROUTE,

        status:
          AgentRunStatus.QUEUED,

        trigger:
          "IMPACT_COMPLETED",

        inputSnapshot: {
          impactAgentRunId:
            impactRun.id,

          affectedCorridorId:
            impact.affectedCorridorId,
        },
      },
    });

  if (
    existing.status ===
    AgentRunStatus.COMPLETED
  ) {
    return existing;
  }

  const claim =
    await prisma.agentRun.updateMany({
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
        status:
          AgentRunStatus.RUNNING,

        startedAt:
          new Date(),

        completedAt:
          null,

        errorMessage:
          null,
      },
    });

  if (claim.count === 0) {
    return prisma.agentRun.findUnique({
      where: {
        id,
      },
    });
  }

  let requestSnapshot:
    Prisma.InputJsonValue = {
      impactAgentRunId:
        impactRun.id,

      affectedCorridorId:
        impact.affectedCorridorId,
    };

  let phase =
    "prepare_route_context";

  try {
    const corridor =
      await prisma
        .roadCorridor
        .findUnique({
          where: {
            id:
              impact
                .affectedCorridorId,
          },

          select: {
            id: true,
            riskScore: true,
          },
        });

    if (!corridor) {
      throw new Error(
        "The affected corridor was not found.",
      );
    }

    const deliveries =
      await prisma.delivery.findMany({
        where: {
          corridorId:
            corridor.id,

          status: {
            notIn: [
              DeliveryStatus.DELIVERED,
              DeliveryStatus.CANCELLED,
            ],
          },
        },

        include: {
          routePlans: {
            orderBy: [
              {
                riskScore:
                  "asc",
              },
              {
                estimatedMinutes:
                  "asc",
              },
            ],
          },
        },

        orderBy: {
          id: "asc",
        },

        take: 101,
      });

    if (
      deliveries.length > 100 ||
      deliveries.some(
        (delivery) =>
          delivery.routePlans
            .length > 50,
      )
    ) {
      throw new Error(
        "Route input exceeds the supported size; no data was truncated.",
      );
    }

    const payload = {
      agentRunId:
        id,

      impactAgentRunId:
        impactRun.id,

      affectedCorridorId:
        corridor.id,

      corridorRiskScore:
        corridor.riskScore,

      communitiesWithoutRecordedAlternative:
        impact.metrics
          .noRecordedOpenAlternative,

      populationWithoutRecordedAlternative:
        impact.metrics
          .knownPopulationWithoutRecordedAlternative,

      deliveries:
        deliveries.map(
          (delivery) => ({
            id:
              delivery.id,

            referenceNumber:
              delivery
                .referenceNumber,

            priority:
              delivery.priority,

            status:
              delivery.status,

            destinationCommunityId:
              delivery
                .destinationCommunityId,

            routeCandidates:
              delivery.routePlans.map(
                (routePlan) => ({
                  id:
                    routePlan.id,

                  name:
                    routePlan.name,

                  distanceKm:
                    routePlan
                      .distanceKm
                      .toNumber(),

                  estimatedMinutes:
                    routePlan
                      .estimatedMinutes,

                  riskScore:
                    routePlan
                      .riskScore,

                  hasGeometry:
                    routePlan
                      .geometry !== null,

                  isApproved:
                    routePlan
                      .isApproved,

                  isRecommended:
                    routePlan
                      .isRecommended,
                }),
              ),
          }),
        ),
    };

    requestSnapshot =
      json(payload);

    await prisma.agentRun.update({
      where: {
        id,
      },

      data: {
        inputSnapshot:
          requestSnapshot,
      },
    });

    phase =
      "call_route_service";

    const response =
      await fetch(
        env.agentServiceUrl +
          "/api/v1/agents/route/analyse-recorded-routes",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(payload),

          signal:
            AbortSignal.timeout(
              15_000,
            ),
        },
      );

    if (!response.ok) {
      throw new Error(
        "Route service returned HTTP " +
          response.status +
          ".",
      );
    }

    const analysis =
      routeResultSchema.parse(
        await response.json(),
      );

    const deliveryById =
      new Map(
        deliveries.map(
          (delivery) => [
            delivery.id,
            delivery,
          ],
        ),
      );

    const returnedDeliveryIds =
      new Set(
        analysis.decisions.map(
          (decision) =>
            decision.deliveryId,
        ),
      );

    const decisionsValid =
      analysis.decisions.every(
        (decision) => {
          const delivery =
            deliveryById.get(
              decision.deliveryId,
            );

          if (
            !delivery ||
            delivery
              .referenceNumber !==
              decision
                .referenceNumber
          ) {
            return false;
          }

          if (
            decision
              .selectedRoutePlanId ===
            null
          ) {
            return (
              decision.action ===
              "HOLD_FOR_ROUTE_VERIFICATION"
            );
          }

          return (
            decision.action ===
              "RECOMMEND_RECORDED_ROUTE" &&
            delivery.routePlans.some(
              (routePlan) =>
                routePlan.id ===
                decision
                  .selectedRoutePlanId,
            )
          );
        },
      );

    if (
      analysis.agentRunId !== id ||
      analysis.impactAgentRunId !==
        impactRun.id ||
      analysis.affectedCorridorId !==
        corridor.id ||
      analysis.decisions.length !==
        deliveries.length ||
      returnedDeliveryIds.size !==
        deliveries.length ||
      [...deliveryById.keys()].some(
        (deliveryId) =>
          !returnedDeliveryIds.has(
            deliveryId,
          ),
      ) ||
      !decisionsValid ||
      analysis.metrics
        .deliveriesReviewed !==
        deliveries.length ||
      new Set(
        analysis.toolCalls.map(
          (call) =>
            call.toolName,
        ),
      ).size !== 2
    ) {
      throw new Error(
        "Route response does not match its request.",
      );
    }

    phase =
      "persist_route_result";

    return await prisma.$transaction(
      async (transaction) => {
        await transaction
          .agentToolCall
          .createMany({
            data:
              analysis.toolCalls.map(
                (call) => ({
                  agentRunId:
                    id,

                  toolName:
                    call.toolName,

                  status:
                    ToolCallStatus
                      .SUCCEEDED,

                  request:
                    requestSnapshot,

                  response:
                    json(
                      call.result,
                    ),

                  completedAt:
                    new Date(),
                }),
              ),
          });

        return transaction
          .agentRun
          .update({
            where: {
              id,
            },

            data: {
              status:
                AgentRunStatus
                  .COMPLETED,

              outputSnapshot:
                json(analysis),

              completedAt:
                new Date(),

              errorMessage:
                null,
            },
          });
      },
    );
  } catch (error) {
    const errorMessage = (
      error instanceof Error
        ? error.message
        : "Unknown Route workflow error."
    ).slice(0, 2000);

    return prisma.$transaction(
      async (transaction) => {
        await transaction
          .agentToolCall
          .create({
            data: {
              agentRunId:
                id,

              toolName:
                phase,

              status:
                ToolCallStatus
                  .FAILED,

              request:
                requestSnapshot,

              errorMessage,

              completedAt:
                new Date(),
            },
          });

        return transaction
          .agentRun
          .update({
            where: {
              id,
            },

            data: {
              status:
                AgentRunStatus
                  .FAILED,

              errorMessage,

              completedAt:
                new Date(),
            },
          });
      },
    );
  }
}