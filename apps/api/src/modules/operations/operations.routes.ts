import {
  AgentType,
  CommunityAccessStatus,
  CorridorStatus,
  DeliveryPriority,
  DeliveryStatus,
  IncidentStatus,
  RecommendationPriority,
  RecommendationStatus,
  Severity,
} from "@prisma/client";

import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";

import { z } from "zod";

import { prisma } from "../../lib/prisma.js";

import {
  requireAuthentication,
} from "../../middleware/auth.js";

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

function asyncHandler(
  handler: AsyncRouteHandler,
): RequestHandler {
  return (
    request,
    response,
    next,
  ) => {
    void handler(
      request,
      response,
      next,
    ).catch(next);
  };
}

function sendValidationError(
  response: Response,
  error: z.ZodError,
): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",

      message:
        "The supplied query parameters are invalid.",

      details: error.issues.map(
        (issue) => ({
          field:
            issue.path.join("."),
          message:
            issue.message,
        }),
      ),
    },
  });
}

function decimalToNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

const corridorQuerySchema =
  z.object({
    status:
      z.nativeEnum(
        CorridorStatus,
      ).optional(),

    district:
      z.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),
  });

const incidentQuerySchema =
  z.object({
    status:
      z.nativeEnum(
        IncidentStatus,
      ).optional(),

    severity:
      z.nativeEnum(
        Severity,
      ).optional(),

    corridorId:
      z.string()
        .uuid()
        .optional(),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25),
  });

const deliveryQuerySchema =
  z.object({
    status:
      z.nativeEnum(
        DeliveryStatus,
      ).optional(),

    priority:
      z.nativeEnum(
        DeliveryPriority,
      ).optional(),

    corridorId:
      z.string()
        .uuid()
        .optional(),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25),
  });

const recommendationQuerySchema =
  z.object({
    status:
      z.nativeEnum(
        RecommendationStatus,
      ).optional(),

    priority:
      z.nativeEnum(
        RecommendationPriority,
      ).optional(),

    agentType:
      z.nativeEnum(
        AgentType,
      ).optional(),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25),
  });

export const operationsRouter =
  Router();

operationsRouter.use(
  requireAuthentication,
);

/*
 * GET /api/v1/operations/overview
 *
 * Returns the main operational picture for
 * authenticated NERVE users.
 */
operationsRouter.get(
  "/overview",

  asyncHandler(
    async (
      _request,
      response,
    ) => {
      const [
        totalCorridors,
        criticalCorridors,
        totalSegments,
        accessibleSegments,
        communitiesAtRisk,
        activeDeliveries,
        criticalIncidents,
        pendingApprovals,
        recentIncidents,
        recentDeliveries,
        recentRecommendations,
      ] = await Promise.all([
        prisma.roadCorridor.count(),

        prisma.roadCorridor.count({
          where: {
            status: {
              in: [
                CorridorStatus.CAUTION,
                CorridorStatus.RESTRICTED,
                CorridorStatus.CLOSED,
              ],
            },
          },
        }),

        prisma.roadSegment.count(),

        prisma.roadSegment.count({
          where: {
            status:
              CorridorStatus.ACCESSIBLE,
          },
        }),

        prisma.community.count({
          where: {
            accessStatus: {
              in: [
                CommunityAccessStatus.AT_RISK,
                CommunityAccessStatus.PARTIALLY_ISOLATED,
                CommunityAccessStatus.ISOLATED,
              ],
            },
          },
        }),

        prisma.delivery.count({
          where: {
            status: {
              in: [
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELAYED,
                DeliveryStatus.REROUTED,
              ],
            },
          },
        }),

        prisma.incident.count({
          where: {
            severity:
              Severity.CRITICAL,

            status: {
              notIn: [
                IncidentStatus.RESOLVED,
                IncidentStatus.DISMISSED,
              ],
            },
          },
        }),

        prisma.agentRecommendation.count({
          where: {
            status:
              RecommendationStatus.AWAITING_APPROVAL,
          },
        }),

        prisma.incident.findMany({
          take: 5,

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

          select: {
            id: true,
            referenceNumber: true,
            title: true,
            type: true,
            severity: true,
            status: true,
            riskScore: true,
            latitude: true,
            longitude: true,
            detectedAt: true,

            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            roadSegment: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            communityImpacts: {
              select: {
                impactLevel: true,
                estimatedIsolationHours: true,
                estimatedPopulationAffected: true,

                community: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    accessStatus: true,
                  },
                },
              },
            },
          },
        }),

        prisma.delivery.findMany({
          take: 5,

          where: {
            status: {
              in: [
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELAYED,
                DeliveryStatus.REROUTED,
              ],
            },
          },

          orderBy: [
            {
              priority: "desc",
            },
            {
              plannedDepartureAt:
                "asc",
            },
          ],

          select: {
            id: true,
            referenceNumber: true,
            cargoType: true,
            cargoDescription: true,
            priority: true,
            status: true,
            quantity: true,
            unit: true,
            originName: true,
            currentLatitude: true,
            currentLongitude: true,
            plannedDepartureAt: true,
            estimatedArrivalAt: true,

            assignedDriver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },

            destinationCommunity: {
              select: {
                id: true,
                code: true,
                name: true,
                accessStatus: true,
              },
            },

            destinationFacility: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },

            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                riskScore: true,
              },
            },
          },
        }),

        prisma.agentRecommendation.findMany({
          take: 5,

          where: {
            status: {
              in: [
                RecommendationStatus.PROPOSED,
                RecommendationStatus.AWAITING_APPROVAL,
                RecommendationStatus.APPROVED,
              ],
            },
          },

          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            agentType: true,
            type: true,
            priority: true,
            status: true,
            title: true,
            reasoning: true,
            confidence: true,
            evidence: true,
            proposedAction: true,
            requiresApproval: true,
            reviewedAt: true,
            expiresAt: true,
            createdAt: true,

            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                severity: true,
              },
            },

            delivery: {
              select: {
                id: true,
                referenceNumber: true,
                cargoType: true,
                status: true,
              },
            },
          },
        }),
      ]);

      const accessibleNetworkPercent =
        totalSegments === 0
          ? 100
          : Math.round(
              (
                accessibleSegments /
                totalSegments
              ) *
                1000,
            ) / 10;

      response.status(200).json({
        data: {
          generatedAt:
            new Date().toISOString(),

          metrics: {
            totalCorridors,
            criticalCorridors,
            totalSegments,
            accessibleSegments,
            accessibleNetworkPercent,
            communitiesAtRisk,
            activeDeliveries,
            criticalIncidents,
            pendingApprovals,
          },

          incidents:
            recentIncidents.map(
              (incident) => ({
                ...incident,

                latitude:
                  decimalToNumber(
                    incident.latitude,
                  ),

                longitude:
                  decimalToNumber(
                    incident.longitude,
                  ),
              }),
            ),

          deliveries:
            recentDeliveries.map(
              (delivery) => ({
                ...delivery,

                quantity:
                  decimalToNumber(
                    delivery.quantity,
                  ),

                currentLatitude:
                  decimalToNumber(
                    delivery.currentLatitude,
                  ),

                currentLongitude:
                  decimalToNumber(
                    delivery.currentLongitude,
                  ),
              }),
            ),

          recommendations:
            recentRecommendations,
        },
      });
    },
  ),
);

/*
 * GET /api/v1/operations/corridors
 */
operationsRouter.get(
  "/corridors",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const parsed =
        corridorQuerySchema.safeParse(
          request.query,
        );

      if (!parsed.success) {
        sendValidationError(
          response,
          parsed.error,
        );

        return;
      }

      const {
        status,
        district,
      } = parsed.data;

      const corridors =
        await prisma.roadCorridor.findMany({
          where: {
            ...(status
              ? {
                  status,
                }
              : {}),

            ...(district
              ? {
                  district: {
                    contains:
                      district,

                    mode:
                      "insensitive",
                  },
                }
              : {}),
          },

          orderBy: [
            {
              riskScore: "desc",
            },
            {
              name: "asc",
            },
          ],

          include: {
            segments: {
              orderBy: {
                code: "asc",
              },
            },

            communityLinks: {
              orderBy: {
                accessPriority:
                  "asc",
              },

              include: {
                community: true,
              },
            },

            facilities: true,

            _count: {
              select: {
                incidents: true,
                deliveries: true,
                recommendations: true,
              },
            },
          },
        });

      response.status(200).json({
        data: {
          total:
            corridors.length,

          corridors:
            corridors.map(
              (corridor) => ({
                id:
                  corridor.id,

                code:
                  corridor.code,

                name:
                  corridor.name,

                district:
                  corridor.district,

                state:
                  corridor.state,

                startLocation:
                  corridor.startLocation,

                endLocation:
                  corridor.endLocation,

                totalDistanceKm:
                  decimalToNumber(
                    corridor.totalDistanceKm,
                  ),

                status:
                  corridor.status,

                riskScore:
                  corridor.riskScore,

                lastAssessedAt:
                  corridor.lastAssessedAt,

                counts:
                  corridor._count,

                segments:
                  corridor.segments.map(
                    (segment) => ({
                      ...segment,

                      startLatitude:
                        decimalToNumber(
                          segment.startLatitude,
                        ),

                      startLongitude:
                        decimalToNumber(
                          segment.startLongitude,
                        ),

                      endLatitude:
                        decimalToNumber(
                          segment.endLatitude,
                        ),

                      endLongitude:
                        decimalToNumber(
                          segment.endLongitude,
                        ),
                    }),
                  ),

                communities:
                  corridor.communityLinks.map(
                    (link) => ({
                      isPrimary:
                        link.isPrimary,

                      accessPriority:
                        link.accessPriority,

                      distanceKm:
                        decimalToNumber(
                          link.distanceKm,
                        ),

                      community: {
                        ...link.community,

                        latitude:
                          decimalToNumber(
                            link.community.latitude,
                          ),

                        longitude:
                          decimalToNumber(
                            link.community.longitude,
                          ),
                      },
                    }),
                  ),

                facilities:
                  corridor.facilities.map(
                    (facility) => ({
                      ...facility,

                      latitude:
                        decimalToNumber(
                          facility.latitude,
                        ),

                      longitude:
                        decimalToNumber(
                          facility.longitude,
                        ),
                    }),
                  ),
              }),
            ),
        },
      });
    },
  ),
);

/*
 * GET /api/v1/operations/incidents
 */
operationsRouter.get(
  "/incidents",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const parsed =
        incidentQuerySchema.safeParse(
          request.query,
        );

      if (!parsed.success) {
        sendValidationError(
          response,
          parsed.error,
        );

        return;
      }

      const {
        status,
        severity,
        corridorId,
        limit,
      } = parsed.data;

      const incidents =
        await prisma.incident.findMany({
          take: limit,

          where: {
            ...(status
              ? {
                  status,
                }
              : {}),

            ...(severity
              ? {
                  severity,
                }
              : {}),

            ...(corridorId
              ? {
                  corridorId,
                }
              : {}),
          },

          orderBy: [
            {
              riskScore: "desc",
            },
            {
              detectedAt: "desc",
            },
          ],

          include: {
            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },

            roadSegment: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },

            reportedBy: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },

            communityImpacts: {
              include: {
                community: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    population: true,
                    accessStatus: true,
                  },
                },
              },
            },

            fieldReports: {
              select: {
                id: true,
                title: true,
                description: true,
                mediaUrls: true,
                verificationStatus: true,
                capturedAt: true,

                reportedBy: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },

              orderBy: {
                capturedAt: "desc",
              },
            },

            _count: {
              select: {
                fieldReports: true,
                recommendations: true,
                communityImpacts: true,
              },
            },
          },
        });

      response.status(200).json({
        data: {
          total:
            incidents.length,

          incidents:
            incidents.map(
              (incident) => ({
                ...incident,

                latitude:
                  decimalToNumber(
                    incident.latitude,
                  ),

                longitude:
                  decimalToNumber(
                    incident.longitude,
                  ),
              }),
            ),
        },
      });
    },
  ),
);

/*
 * GET /api/v1/operations/deliveries
 */
operationsRouter.get(
  "/deliveries",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const parsed =
        deliveryQuerySchema.safeParse(
          request.query,
        );

      if (!parsed.success) {
        sendValidationError(
          response,
          parsed.error,
        );

        return;
      }

      const {
        status,
        priority,
        corridorId,
        limit,
      } = parsed.data;

      const deliveries =
        await prisma.delivery.findMany({
          take: limit,

          where: {
            ...(status
              ? {
                  status,
                }
              : {}),

            ...(priority
              ? {
                  priority,
                }
              : {}),

            ...(corridorId
              ? {
                  corridorId,
                }
              : {}),
          },

          orderBy: [
            {
              priority: "desc",
            },
            {
              plannedDepartureAt:
                "asc",
            },
          ],

          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
                organisation: true,
              },
            },

            assignedDriver: {
              select: {
                id: true,
                fullName: true,
                email: true,
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
              },
            },

            destinationCommunity: true,
            destinationFacility: true,

            routePlans: {
              orderBy: [
                {
                  isRecommended:
                    "desc",
                },
                {
                  createdAt:
                    "desc",
                },
              ],
            },

            recommendations: {
              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        });

      response.status(200).json({
        data: {
          total:
            deliveries.length,

          deliveries:
            deliveries.map(
              (delivery) => ({
                ...delivery,

                quantity:
                  decimalToNumber(
                    delivery.quantity,
                  ),

                originLatitude:
                  decimalToNumber(
                    delivery.originLatitude,
                  ),

                originLongitude:
                  decimalToNumber(
                    delivery.originLongitude,
                  ),

                currentLatitude:
                  decimalToNumber(
                    delivery.currentLatitude,
                  ),

                currentLongitude:
                  decimalToNumber(
                    delivery.currentLongitude,
                  ),

                destinationCommunity: {
                  ...delivery.destinationCommunity,

                  latitude:
                    decimalToNumber(
                      delivery
                        .destinationCommunity
                        .latitude,
                    ),

                  longitude:
                    decimalToNumber(
                      delivery
                        .destinationCommunity
                        .longitude,
                    ),
                },

                destinationFacility:
                  delivery.destinationFacility
                    ? {
                        ...delivery.destinationFacility,

                        latitude:
                          decimalToNumber(
                            delivery
                              .destinationFacility
                              .latitude,
                          ),

                        longitude:
                          decimalToNumber(
                            delivery
                              .destinationFacility
                              .longitude,
                          ),
                      }
                    : null,

                routePlans:
                  delivery.routePlans.map(
                    (routePlan) => ({
                      ...routePlan,

                      distanceKm:
                        decimalToNumber(
                          routePlan.distanceKm,
                        ),
                    }),
                  ),
              }),
            ),
        },
      });
    },
  ),
);

/*
 * GET /api/v1/operations/recommendations
 */
operationsRouter.get(
  "/recommendations",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const parsed =
        recommendationQuerySchema.safeParse(
          request.query,
        );

      if (!parsed.success) {
        sendValidationError(
          response,
          parsed.error,
        );

        return;
      }

      const {
        status,
        priority,
        agentType,
        limit,
      } = parsed.data;

      const recommendations =
        await prisma.agentRecommendation.findMany({
          take: limit,

          where: {
            ...(status
              ? {
                  status,
                }
              : {}),

            ...(priority
              ? {
                  priority,
                }
              : {}),

            ...(agentType
              ? {
                  agentType,
                }
              : {}),
          },

          orderBy: {
            createdAt: "desc",
          },

          include: {
            agentRun: {
              select: {
                id: true,
                agentType: true,
                status: true,
                trigger: true,
                startedAt: true,
                completedAt: true,
              },
            },

            corridor: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                riskScore: true,
              },
            },

            roadSegment: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                riskScore: true,
              },
            },

            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                severity: true,
                status: true,
              },
            },

            delivery: {
              select: {
                id: true,
                referenceNumber: true,
                cargoType: true,
                priority: true,
                status: true,
              },
            },

            reviewedBy: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },

            decisions: {
              include: {
                actor: {
                  select: {
                    id: true,
                    fullName: true,
                    role: true,
                  },
                },
              },

              orderBy: {
                decidedAt: "desc",
              },
            },
          },
        });

      response.status(200).json({
        data: {
          total:
            recommendations.length,

          recommendations,
        },
      });
    },
  ),
);

/*
 * GET /api/v1/operations/agent-runs
 */
operationsRouter.get(
  "/agent-runs",

  asyncHandler(
    async (
      _request,
      response,
    ) => {
      const runs =
        await prisma.agentRun.findMany({
          take: 25,

          orderBy: {
            createdAt: "desc",
          },

          include: {
            toolCalls: {
              orderBy: {
                startedAt: "asc",
              },
            },

            recommendations: {
              select: {
                id: true,
                type: true,
                priority: true,
                status: true,
                title: true,
                confidence: true,
              },
            },
          },
        });

      response.status(200).json({
        data: {
          total:
            runs.length,

          runs,
        },
      });
    },
  ),
);