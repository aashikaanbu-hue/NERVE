import { createHash } from "node:crypto";

import {
  AgentRunStatus,
  AgentType,
  Prisma,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  ToolCallStatus,
  type AgentRun,
} from "@prisma/client";

import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "./prisma.js";


const count =
  z.number().int().nonnegative();


const routeDecisionSchema =
  z.object({
    deliveryId:
      z.string().uuid(),

    referenceNumber:
      z.string().min(1),

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
      z.array(z.string()).min(1),
  });


const routeInputSchema =
  z.object({
    agentRunId:
      z.string().uuid(),

    affectedCorridorId:
      z.string().uuid(),

    corridorRiskScore:
      z.number()
        .min(0)
        .max(100),

    communitiesWithoutRecordedAlternative:
      count,

    populationWithoutRecordedAlternative:
      count,
  });


const routeOutputSchema =
  z.object({
    agentRunId:
      z.string().uuid(),

    status:
      z.literal("COMPLETED"),

    affectedCorridorId:
      z.string().uuid(),

    decisions:
      z.array(
        routeDecisionSchema,
      ),

    nextAgent:
      z.literal("COMMAND").nullable(),
  });


const proposedActionSchema =
  z.discriminatedUnion(
    "action",
    [
      z.object({
        action:
          z.literal(
            "APPROVE_RECORDED_ROUTE",
          ),

        deliveryId:
          z.string().uuid(),

        routePlanId:
          z.string().uuid(),

        routeName:
          z.string().min(1),

        executionBlockedUntilApproval:
          z.literal(true),

        prerequisites:
          z.array(z.string()).min(1),
      }),

      z.object({
        action:
          z.literal(
            "HOLD_DELIVERY",
          ),

        deliveryId:
          z.string().uuid(),

        executionBlockedUntilApproval:
          z.literal(true),

        prerequisites:
          z.array(z.string()).min(1),
      }),
    ],
  );


const commandPlanSchema =
  z.object({
    deliveryId:
      z.string().uuid(),

    referenceNumber:
      z.string().min(1),

    recommendationType:
      z.enum([
        "ROUTE_CHANGE",
        "DELIVERY_HOLD",
      ]),

    priority:
      z.enum([
        "HIGH",
        "CRITICAL",
      ]),

    title:
      z.string().min(1),

    reasoning:
      z.string().min(1),

    confidence:
      z.number()
        .min(0)
        .max(1),

    evidence:
      z.object({
        routeAgentRunId:
          z.string().uuid(),

        affectedCorridorId:
          z.string().uuid(),

        corridorRiskScore:
          z.number()
            .min(0)
            .max(100),

        communitiesWithoutRecordedAlternative:
          count,

        populationWithoutRecordedAlternative:
          count,

        decisionReasons:
          z.array(z.string()),

        potentialExposureOnly:
          z.literal(true),
      }).passthrough(),

    proposedAction:
      proposedActionSchema,

    requiresApproval:
      z.literal(true),
  });


const commandResultSchema =
  z.object({
    agentRunId:
      z.string().uuid(),

    routeAgentRunId:
      z.string().uuid(),

    affectedCorridorId:
      z.string().uuid(),

    status:
      z.literal("COMPLETED"),

    assessmentStatus:
      z.literal(
        "READY_FOR_REVIEW",
      ),

    methodology:
      z.literal(
        "human-supervised-action-plan-v1",
      ),

    plans:
      z.array(commandPlanSchema),

    metrics:
      z.object({
        decisionsReviewed:
          count,

        recommendationsPrepared:
          count,

        routeChanges:
          count,

        deliveryHolds:
          count,

        criticalActions:
          count,
      }),

    reasoning:
      z.string().min(1),

    recommendedAction:
      z.string().min(1),

    requiresApproval:
      z.literal(true),

    nextAgent:
      z.null(),

    limitations:
      z.array(z.string()),

    toolCalls:
      z.array(
        z.object({
          toolName:
            z.enum([
              "consolidate_agent_evidence",
              "build_supervised_action_plan",
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


function stableUuid(
  sourceId: string,
  salt: string,
): string {
  const bytes =
    createHash("sha1")
      .update(
        Buffer.from(
          sourceId.replaceAll(
            "-",
            "",
          ),
          "hex",
        ),
      )
      .update(salt)
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


function commandIdFor(
  routeRunId: string,
): string {
  return stableUuid(
    routeRunId,
    "NERVE:COMMAND:v1",
  );
}


function recommendationIdFor(
  commandRunId: string,
  deliveryId: string,
  type: string,
): string {
  return stableUuid(
    commandRunId,
    [
      "NERVE:RECOMMENDATION:v1",
      deliveryId,
      type,
    ].join(":"),
  );
}


function recommendationTypeFor(
  value:
    | "ROUTE_CHANGE"
    | "DELIVERY_HOLD",
): RecommendationType {
  if (
    value ===
    "DELIVERY_HOLD"
  ) {
    return RecommendationType
      .DELIVERY_HOLD;
  }

  return RecommendationType
    .ROUTE_CHANGE;
}


function recommendationPriorityFor(
  value:
    | "HIGH"
    | "CRITICAL",
): RecommendationPriority {
  if (
    value ===
    "CRITICAL"
  ) {
    return RecommendationPriority
      .CRITICAL;
  }

  return RecommendationPriority
    .HIGH;
}


export async function processCommandAfterRoute(
  routeRunId: string,
): Promise<AgentRun | null> {
  const routeRun =
    await prisma.agentRun.findUnique({
      where: {
        id: routeRunId,
      },
    });

  if (
    !routeRun ||
    routeRun.agentType !==
      AgentType.ROUTE ||
    routeRun.status !==
      AgentRunStatus.COMPLETED
  ) {
    throw new Error(
      "Command requires a completed Route run.",
    );
  }

  const routeInput =
    routeInputSchema.parse(
      routeRun.inputSnapshot,
    );

  const routeOutput =
    routeOutputSchema.parse(
      routeRun.outputSnapshot,
    );

  if (
    routeInput.agentRunId !==
      routeRun.id ||
    routeOutput.agentRunId !==
      routeRun.id ||
    routeInput.affectedCorridorId !==
      routeOutput.affectedCorridorId
  ) {
    throw new Error(
      "Route snapshots do not match their run.",
    );
  }

  if (
    routeOutput.nextAgent !==
    "COMMAND"
  ) {
    return null;
  }

  if (
    routeOutput.decisions.length === 0
  ) {
    throw new Error(
      "Command requires at least one Route decision.",
    );
  }

  const id =
    commandIdFor(routeRun.id);

  const existing =
    await prisma.agentRun.upsert({
      where: {
        id,
      },

      update: {
        trigger:
          "ROUTE_COMPLETED",
      },

      create: {
        id,

        agentType:
          AgentType.COMMAND,

        status:
          AgentRunStatus.QUEUED,

        trigger:
          "ROUTE_COMPLETED",

        inputSnapshot: {
          routeAgentRunId:
            routeRun.id,

          affectedCorridorId:
            routeOutput
              .affectedCorridorId,
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

  const payload = {
    agentRunId:
      id,

    routeAgentRunId:
      routeRun.id,

    affectedCorridorId:
      routeOutput
        .affectedCorridorId,

    corridorRiskScore:
      routeInput
        .corridorRiskScore,

    communitiesWithoutRecordedAlternative:
      routeInput
        .communitiesWithoutRecordedAlternative,

    populationWithoutRecordedAlternative:
      routeInput
        .populationWithoutRecordedAlternative,

    decisions:
      routeOutput.decisions,
  };

  const requestSnapshot =
    json(payload);

  let phase =
    "prepare_command_context";

  try {
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
      "call_command_service";

    const response =
      await fetch(
        env.agentServiceUrl +
          "/api/v1/agents/command/build-action-plan",
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
        "Command service returned HTTP " +
          response.status +
          ".",
      );
    }

    const analysis =
      commandResultSchema.parse(
        await response.json(),
      );

    const decisionByDeliveryId =
      new Map(
        routeOutput.decisions.map(
          (decision) => [
            decision.deliveryId,
            decision,
          ],
        ),
      );

    const returnedDeliveryIds =
      new Set(
        analysis.plans.map(
          (plan) =>
            plan.deliveryId,
        ),
      );

    const plansValid =
      analysis.plans.every(
        (plan) => {
          const decision =
            decisionByDeliveryId.get(
              plan.deliveryId,
            );

          if (
            !decision ||
            decision.referenceNumber !==
              plan.referenceNumber ||
            plan.evidence
              .routeAgentRunId !==
              routeRun.id ||
            plan.evidence
              .affectedCorridorId !==
              routeOutput
                .affectedCorridorId ||
            plan.proposedAction
              .deliveryId !==
              plan.deliveryId
          ) {
            return false;
          }

          if (
            plan.recommendationType ===
            "ROUTE_CHANGE"
          ) {
            return (
              decision.action ===
                "RECOMMEND_RECORDED_ROUTE" &&
              plan.proposedAction
                .action ===
                "APPROVE_RECORDED_ROUTE" &&
              decision
                .selectedRoutePlanId ===
                plan.proposedAction
                  .routePlanId
            );
          }

          return (
            decision.action ===
              "HOLD_FOR_ROUTE_VERIFICATION" &&
            plan.proposedAction
              .action ===
              "HOLD_DELIVERY"
          );
        },
      );

    const routeChangeCount =
      analysis.plans.filter(
        (plan) =>
          plan.recommendationType ===
          "ROUTE_CHANGE",
      ).length;

    const deliveryHoldCount =
      analysis.plans.filter(
        (plan) =>
          plan.recommendationType ===
          "DELIVERY_HOLD",
      ).length;

    const criticalCount =
      analysis.plans.filter(
        (plan) =>
          plan.priority ===
          "CRITICAL",
      ).length;

    if (
      analysis.agentRunId !== id ||
      analysis.routeAgentRunId !==
        routeRun.id ||
      analysis.affectedCorridorId !==
        routeOutput
          .affectedCorridorId ||
      analysis.plans.length !==
        routeOutput.decisions.length ||
      returnedDeliveryIds.size !==
        routeOutput.decisions.length ||
      [
        ...decisionByDeliveryId.keys(),
      ].some(
        (deliveryId) =>
          !returnedDeliveryIds.has(
            deliveryId,
          ),
      ) ||
      !plansValid ||
      analysis.metrics
        .decisionsReviewed !==
        routeOutput.decisions.length ||
      analysis.metrics
        .recommendationsPrepared !==
        analysis.plans.length ||
      analysis.metrics
        .routeChanges !==
        routeChangeCount ||
      analysis.metrics
        .deliveryHolds !==
        deliveryHoldCount ||
      analysis.metrics
        .criticalActions !==
        criticalCount ||
      new Set(
        analysis.toolCalls.map(
          (call) =>
            call.toolName,
        ),
      ).size !== 2
    ) {
      throw new Error(
        "Command response does not match its request.",
      );
    }

    phase =
      "persist_command_result";

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

        for (
          const plan
          of analysis.plans
        ) {
          const type =
            recommendationTypeFor(
              plan
                .recommendationType,
            );

          const priority =
            recommendationPriorityFor(
              plan.priority,
            );

          const recommendationId =
            recommendationIdFor(
              id,
              plan.deliveryId,
              plan
                .recommendationType,
            );

          await transaction
            .agentRecommendation
            .upsert({
              where: {
                id:
                  recommendationId,
              },

              update: {
                agentRunId:
                  id,

                corridorId:
                  routeOutput
                    .affectedCorridorId,

                deliveryId:
                  plan.deliveryId,

                agentType:
                  AgentType.COMMAND,

                type,
                priority,

                title:
                  plan.title,

                reasoning:
                  plan.reasoning,

                confidence:
                  plan.confidence,

                evidence:
                  json(
                    plan.evidence,
                  ),

                proposedAction:
                  json(
                    plan
                      .proposedAction,
                  ),

                requiresApproval:
                  true,
              },

              create: {
                id:
                  recommendationId,

                agentRunId:
                  id,

                corridorId:
                  routeOutput
                    .affectedCorridorId,

                deliveryId:
                  plan.deliveryId,

                agentType:
                  AgentType.COMMAND,

                type,
                priority,

                status:
                  RecommendationStatus
                    .AWAITING_APPROVAL,

                title:
                  plan.title,

                reasoning:
                  plan.reasoning,

                confidence:
                  plan.confidence,

                evidence:
                  json(
                    plan.evidence,
                  ),

                proposedAction:
                  json(
                    plan
                      .proposedAction,
                  ),

                requiresApproval:
                  true,
              },
            });
        }

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
        : "Unknown Command workflow error."
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