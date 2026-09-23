import {
  CommunityAccessStatus,
  CorridorStatus,
  DeliveryStatus,
  IncidentStatus,
  Severity,
  UserRole,
} from "@prisma/client";

import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { prisma } from "../../lib/prisma.js";

import {
  requireAuthentication,
  requireRoles,
} from "../../middleware/auth.js";

type PriorityBand =
  | "P1"
  | "P2"
  | "P3"
  | "P4";

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

function asyncHandler(
  handler: AsyncRouteHandler,
) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    void handler(
      request,
      response,
      next,
    ).catch(next);
  };
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function getCargoUrgencyScore(
  cargoType: string,
  cargoDescription: string | null,
): number {
  const cargo =
    `${cargoType} ${cargoDescription ?? ""}`
      .toLowerCase();

  const criticalTerms = [
    "oxygen",
    "blood",
    "insulin",
    "vaccine",
    "antibiotic",
    "medicine",
    "medical",
    "emergency",
    "iv fluid",
  ];

  const essentialTerms = [
    "drinking water",
    "water",
    "food",
    "fuel",
    "shelter",
    "nutrition",
  ];

  const supportTerms = [
    "hygiene",
    "sanitation",
    "blanket",
    "relief",
    "communication",
  ];

  if (
    criticalTerms.some(
      (term) => cargo.includes(term),
    )
  ) {
    return 25;
  }

  if (
    essentialTerms.some(
      (term) => cargo.includes(term),
    )
  ) {
    return 20;
  }

  if (
    supportTerms.some(
      (term) => cargo.includes(term),
    )
  ) {
    return 15;
  }

  return 10;
}

function getShortageRiskScore(
  accessStatus: CommunityAccessStatus,
  vulnerabilityScore: number,
): number {
  const accessScore: Record<
    CommunityAccessStatus,
    number
  > = {
   CONNECTED : 4,
    AT_RISK: 13,
    PARTIALLY_ISOLATED: 17,
    ISOLATED: 20,
    UNKNOWN: 8,
  };

  const vulnerabilityBonus =
    vulnerabilityScore >= 80
      ? 3
      : vulnerabilityScore >= 60
        ? 2
        : vulnerabilityScore >= 40
          ? 1
          : 0;

  return clamp(
    accessScore[accessStatus] +
      vulnerabilityBonus,
    0,
    20,
  );
}

function getPopulationScore(
  population: number | null,
): number {
  const value = population ?? 0;

  if (value >= 15000) {
    return 15;
  }

  if (value >= 10000) {
    return 13;
  }

  if (value >= 5000) {
    return 11;
  }

  if (value >= 2000) {
    return 8;
  }

  if (value > 0) {
    return 5;
  }

  return 3;
}

function getDelayScore(
  status: DeliveryStatus,
  estimatedArrivalAt: Date | null,
): number {
  if (status === DeliveryStatus.DELAYED) {
    return 15;
  }

  if (estimatedArrivalAt) {
    const remainingHours =
      (
        estimatedArrivalAt.getTime() -
        Date.now()
      ) /
      3_600_000;

    if (remainingHours <= 0) {
      return 15;
    }

    if (remainingHours <= 3) {
      return 13;
    }

    if (remainingHours <= 6) {
      return 10;
    }

    if (remainingHours <= 12) {
      return 7;
    }
  }

  if (
    status ===
    DeliveryStatus.APPROVAL_PENDING
  ) {
    return 9;
  }

  if (
    status === DeliveryStatus.PLANNED
  ) {
    return 6;
  }

  return 4;
}

function getRouteRiskScore(
  status: CorridorStatus | null,
  riskScore: number,
): number {
  const riskComponent =
    clamp(
      Math.round(riskScore * 0.15),
      0,
      15,
    );

  if (!status) {
    return Math.max(riskComponent, 6);
  }

  const statusScore: Record<
    CorridorStatus,
    number
  > = {
    ACCESSIBLE: 3,
    CAUTION: 10,
    RESTRICTED: 13,
    CLOSED: 15,
    UNKNOWN: 6,
  };

  return Math.max(
    riskComponent,
    statusScore[status],
   );
}

function getDisasterSeverityScore(
  severity: Severity | null,
): number {
  if (!severity) {
    return 0;
  }

  const severityScores: Record<
    Severity,
    number
  > = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 4,
    CRITICAL: 5,
  };

  return severityScores[severity];
}

function getPriorityBand(
  score: number,
): PriorityBand {
  if (score >= 80) {
    return "P1";
  }

  if (score >= 60) {
    return "P2";
  }

  if (score >= 40) {
    return "P3";
  }

  return "P4";
}

function getPriorityLabel(
  band: PriorityBand,
): string {
  const labels: Record<
    PriorityBand,
    string
  > = {
    P1: "Immediate life-saving movement",
    P2: "Urgent essential movement",
    P3: "Priority scheduled movement",
    P4: "Routine monitored movement",
  };

  return labels[band];
}

function getRecommendedAction(
  band: PriorityBand,
): string {
  const actions: Record<
    PriorityBand,
    string
  > = {
    P1:
      "Dispatch immediately using the safest available route and maintain live command monitoring.",
    P2:
      "Secure vehicle and route clearance, then dispatch within the next operational window.",
    P3:
      "Keep the delivery scheduled and reassess if risk, shortage or delay increases.",
    P4:
      "Continue routine planning with standard monitoring.",
  };

  return actions[band];
}

export const supplyPriorityRouter =
  Router();

supplyPriorityRouter.use(
  requireAuthentication,
);

supplyPriorityRouter.use(
  requireRoles(
    UserRole.GOVERNMENT_AUTHORITY,
    UserRole.LOGISTICS_OPERATOR,
  ),
);

supplyPriorityRouter.get(
  "/",
  asyncHandler(
    async (
      _request,
      response,
    ) => {
      const deliveries =
        await prisma.delivery.findMany({
          where: {
            status: {
              notIn: [
                DeliveryStatus.DELIVERED,
                DeliveryStatus.CANCELLED,
              ],
            },
          },

          orderBy: {
            createdAt: "asc",
          },

          include: {
            destinationCommunity: {
              select: {
                id: true,
                code: true,
                name: true,
                district: true,
                population: true,
                vulnerabilityScore: true,
                accessStatus: true,
              },
            },

            destinationFacility: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                operational: true,
                accessStatus: true,
              },
            },

            assignedDriver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },

            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                riskScore: true,

                incidents: {
                  where: {
                    status: {
                      notIn: [
                        IncidentStatus.RESOLVED,
                        IncidentStatus.DISMISSED,
                      ],
                    },
                  },

                  orderBy: [
                    {
                      riskScore: "desc",
                    },
                    {
                      detectedAt: "desc",
                    },
                  ],

                  take: 1,

                  select: {
                    id: true,
                    referenceNumber: true,
                    title: true,
                    severity: true,
                    riskScore: true,
                  },
                },
              },
            },
          },
        });

      const rankedDeliveries =
        deliveries
          .map((delivery) => {
            const activeIncident =
              delivery.corridor
                ?.incidents[0] ?? null;

            const factors = {
              cargoUrgency:
                getCargoUrgencyScore(
                  delivery.cargoType,
                  delivery.cargoDescription,
                ),

              shortageRisk:
                getShortageRiskScore(
                  delivery
                    .destinationCommunity
                    .accessStatus,

                  delivery
                    .destinationCommunity
                    .vulnerabilityScore,
                ),

              populationImpact:
                getPopulationScore(
                  delivery
                    .destinationCommunity
                    .population,
                ),

              delayPressure:
                getDelayScore(
                  delivery.status,
                  delivery
                    .estimatedArrivalAt,
                ),

              routeRisk:
                getRouteRiskScore(
                  delivery.corridor
                    ?.status ?? null,

                  delivery.corridor
                    ?.riskScore ?? 0,
                ),

              disasterSeverity:
                getDisasterSeverityScore(
                  activeIncident
                    ?.severity ?? null,
                ),

              vehicleReadiness:
                delivery.assignedDriver
                  ? 5
                  : 2,
            };

            const score =
              clamp(
                Object.values(
                  factors,
                ).reduce(
                  (
                    total,
                    value,
                  ) =>
                    total + value,
                  0,
                ),
                0,
                100,
              );

            const band =
              getPriorityBand(score);

            const reasons: string[] = [];

            if (
              factors.cargoUrgency >= 20
            ) {
              reasons.push(
                "Cargo contains life-saving or essential supplies.",
              );
            }

            if (
              factors.shortageRisk >= 13
            ) {
              reasons.push(
                `${delivery.destinationCommunity.name} has elevated isolation or shortage exposure.`,
              );
            }

            if (
              factors.populationImpact >= 11
            ) {
              reasons.push(
                `The delivery protects ${
                  delivery
                    .destinationCommunity
                    .population?.toLocaleString(
                      "en-IN",
                    ) ?? "a large number of"
                } residents.`,
              );
            }

            if (
              factors.delayPressure >= 10
            ) {
              reasons.push(
                "The delivery is delayed or close to its required arrival window.",
              );
            }

            if (
              factors.routeRisk >= 10
            ) {
              reasons.push(
                "The assigned corridor has elevated disruption risk.",
              );
            }

            if (
              factors.disasterSeverity >= 4
            ) {
              reasons.push(
                "A high-severity active incident affects this movement.",
              );
            }

            if (!delivery.assignedDriver) {
              reasons.push(
                "A driver still needs to be assigned.",
              );
            }

            if (reasons.length === 0) {
              reasons.push(
                "The delivery remains stable under current operational conditions.",
              );
            }

            return {
              rank: 0,
              score,
              band,
              label:
                getPriorityLabel(band),
              recommendedAction:
                getRecommendedAction(
                  band,
                ),
              reasons,
              factors,

              delivery: {
                id: delivery.id,
                referenceNumber:
                  delivery.referenceNumber,
                cargoType:
                  delivery.cargoType,
                cargoDescription:
                  delivery.cargoDescription,
                quantity:
                  delivery.quantity
                    ? Number(
                        delivery.quantity,
                      )
                    : null,
                unit: delivery.unit,
                priority:
                  delivery.priority,
                status:
                  delivery.status,
                originName:
                  delivery.originName,
                plannedDepartureAt:
                  delivery
                    .plannedDepartureAt,
                estimatedArrivalAt:
                  delivery
                    .estimatedArrivalAt,
              },

              destinationCommunity:
                delivery
                  .destinationCommunity,

              destinationFacility:
                delivery
                  .destinationFacility,

              assignedDriver:
                delivery.assignedDriver,

              corridor:
                delivery.corridor
                  ? {
                      id:
                        delivery.corridor
                          .id,
                      code:
                        delivery.corridor
                          .code,
                      name:
                        delivery.corridor
                          .name,
                      status:
                        delivery.corridor
                          .status,
                      riskScore:
                        delivery.corridor
                          .riskScore,
                    }
                  : null,

              activeIncident,
            };
          })
          .sort(
            (
              first,
              second,
            ) =>
              second.score -
                first.score ||
              first.delivery
                .referenceNumber
                .localeCompare(
                  second.delivery
                    .referenceNumber,
                ),
          )
          .map(
            (
              item,
              index,
            ) => ({
              ...item,
              rank: index + 1,
            }),
          );

      const metrics = {
        total:
          rankedDeliveries.length,

        p1:
          rankedDeliveries.filter(
            (item) =>
              item.band === "P1",
          ).length,

        p2:
          rankedDeliveries.filter(
            (item) =>
              item.band === "P2",
          ).length,

        p3:
          rankedDeliveries.filter(
            (item) =>
              item.band === "P3",
          ).length,

        p4:
          rankedDeliveries.filter(
            (item) =>
              item.band === "P4",
          ).length,
      };

      response.status(200).json({
        data: {
          generatedAt:
            new Date().toISOString(),

          metrics,

          methodology: {
            cargoUrgency: 25,
            shortageRisk: 20,
            populationImpact: 15,
            delayPressure: 15,
            routeRisk: 15,
            disasterSeverity: 5,
            vehicleReadiness: 5,
            maximumScore: 100,
          },

          priorities:
            rankedDeliveries,
        },
      });
    },
  ),
);