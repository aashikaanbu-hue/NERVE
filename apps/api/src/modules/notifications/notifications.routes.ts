import {
  AuditAction,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  Prisma,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
  UserRole,
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
  type AuthenticatedRequest,
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
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

function sendValidationError(
  response: Response,
  error: z.ZodError,
): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "The supplied notification request is invalid.",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
}

const notificationQuerySchema = z.object({
  status: z
    .enum([
      "ALL",
      NotificationStatus.UNREAD,
      NotificationStatus.READ,
      NotificationStatus.ACKNOWLEDGED,
      NotificationStatus.DISMISSED,
    ])
    .default("ALL"),

  severity: z.nativeEnum(NotificationSeverity).optional(),
  type: z.nativeEnum(NotificationType).optional(),

  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const notificationParamsSchema = z.object({
  notificationId: z.string().uuid(),
});

const notificationStatusSchema = z.object({
  status: z.enum([
    NotificationStatus.UNREAD,
    NotificationStatus.READ,
    NotificationStatus.ACKNOWLEDGED,
    NotificationStatus.DISMISSED,
  ]),
});

const roleRecommendationTypes: Record<
  UserRole,
  RecommendationType[]
> = {
  GOVERNMENT_AUTHORITY: Object.values(RecommendationType),

  LOGISTICS_OPERATOR: [
    RecommendationType.PREPOSITION_SUPPLIES,
    RecommendationType.ROUTE_CHANGE,
    RecommendationType.DELIVERY_HOLD,
    RecommendationType.DISPATCH_SUPPORT,
  ],

  FIELD_OFFICIAL: [
    RecommendationType.ROAD_RESTRICTION,
    RecommendationType.COMMUNITY_ALERT,
    RecommendationType.FIELD_VERIFICATION,
    RecommendationType.PREPOSITION_SUPPLIES,
  ],

  DRIVER: [
    RecommendationType.ROAD_RESTRICTION,
    RecommendationType.ROUTE_CHANGE,
    RecommendationType.DELIVERY_HOLD,
    RecommendationType.DISPATCH_SUPPORT,
  ],
};

function notificationTypeFor(
  recommendationType: RecommendationType,
): NotificationType {
  if (
    recommendationType === RecommendationType.ROAD_RESTRICTION ||
    recommendationType === RecommendationType.FIELD_VERIFICATION
  ) {
    return NotificationType.RISK_ALERT;
  }

  if (
    recommendationType === RecommendationType.COMMUNITY_ALERT
  ) {
    return NotificationType.COMMUNITY_IMPACT;
  }

  if (
    recommendationType === RecommendationType.ROUTE_CHANGE
  ) {
    return NotificationType.ROUTE_UPDATE;
  }

  if (
    recommendationType ===
      RecommendationType.PREPOSITION_SUPPLIES ||
    recommendationType ===
      RecommendationType.DISPATCH_SUPPORT ||
    recommendationType ===
      RecommendationType.DELIVERY_HOLD
  ) {
    return NotificationType.DELIVERY_UPDATE;
  }

  return NotificationType.APPROVAL_DECISION;
}

function notificationSeverityFor(
  priority: RecommendationPriority,
): NotificationSeverity {
  if (priority === RecommendationPriority.CRITICAL) {
    return NotificationSeverity.CRITICAL;
  }

  if (priority === RecommendationPriority.HIGH) {
    return NotificationSeverity.HIGH;
  }

  if (priority === RecommendationPriority.MEDIUM) {
    return NotificationSeverity.MEDIUM;
  }

  if (priority === RecommendationPriority.LOW) {
    return NotificationSeverity.LOW;
  }

  return NotificationSeverity.INFO;
}

function actionUrlFor(
  notificationType: NotificationType,
): string {
  if (
    notificationType === NotificationType.RISK_ALERT ||
    notificationType === NotificationType.COMMUNITY_IMPACT
  ) {
    return "/dashboard/risk-intelligence";
  }

  if (
    notificationType === NotificationType.ROUTE_UPDATE
  ) {
    return "/dashboard/route-planning";
  }

  if (
    notificationType === NotificationType.DELIVERY_UPDATE
  ) {
    return "/dashboard/deliveries";
  }

  return "/dashboard/approvals";
}

async function syncApprovedRecommendationsForUser(
  userId: string,
  role: UserRole,
): Promise<void> {
  const recommendations =
    await prisma.agentRecommendation.findMany({
      where: {
        status: {
          in: [
            RecommendationStatus.APPROVED,
            RecommendationStatus.EXECUTED,
          ],
        },

        type: {
          in: roleRecommendationTypes[role],
        },
      },

      take: 50,

      orderBy: {
        reviewedAt: "desc",
      },

      include: {
        corridor: {
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
      },
    });

  await Promise.all(
    recommendations.map((recommendation) => {
      const type = notificationTypeFor(
        recommendation.type,
      );

      return prisma.operationalNotification.upsert({
        where: {
          userId_sourceRecommendationId_type: {
            userId,
            sourceRecommendationId: recommendation.id,
            type,
          },
        },

        create: {
          userId,
          sourceRecommendationId: recommendation.id,
          type,
          severity: notificationSeverityFor(
            recommendation.priority,
          ),
          status: NotificationStatus.UNREAD,
          title: recommendation.title,
          message: recommendation.reasoning,
          actionUrl: actionUrlFor(type),
          deliveredAt:
            recommendation.reviewedAt ??
            recommendation.updatedAt,

          metadata: {
            agentType: recommendation.agentType,
            recommendationType: recommendation.type,
            recommendationStatus: recommendation.status,
            confidence: recommendation.confidence,
            corridor: recommendation.corridor,
            incident: recommendation.incident,
            delivery: recommendation.delivery,
            reviewedBy: recommendation.reviewedBy,
          },
        },

        update: {
          severity: notificationSeverityFor(
            recommendation.priority,
          ),
          title: recommendation.title,
          message: recommendation.reasoning,
          actionUrl: actionUrlFor(type),

          metadata: {
            agentType: recommendation.agentType,
            recommendationType: recommendation.type,
            recommendationStatus: recommendation.status,
            confidence: recommendation.confidence,
            corridor: recommendation.corridor,
            incident: recommendation.incident,
            delivery: recommendation.delivery,
            reviewedBy: recommendation.reviewedBy,
          },
        },
      });
    }),
  );
}

export const notificationsRouter = Router();

notificationsRouter.use(requireAuthentication);

notificationsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const parsedQuery =
      notificationQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      sendValidationError(
        response,
        parsedQuery.error,
      );
      return;
    }

    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { userId, role } =
      authenticatedRequest.auth;

    const {
      status,
      severity,
      type,
      limit,
    } = parsedQuery.data;

    await syncApprovedRecommendationsForUser(
      userId,
      role,
    );

    const where: Prisma.OperationalNotificationWhereInput =
      {
        userId,
        ...(status === "ALL" ? {} : { status }),
        ...(severity ? { severity } : {}),
        ...(type ? { type } : {}),
      };

    const [
      notifications,
      total,
      unread,
      critical,
      acknowledged,
    ] = await prisma.$transaction([
      prisma.operationalNotification.findMany({
        where,
        take: limit,

        orderBy: [
          { status: "asc" },
          { deliveredAt: "desc" },
        ],

        include: {
          sourceRecommendation: {
            select: {
              id: true,
              agentType: true,
              type: true,
              priority: true,
              status: true,
              title: true,
              confidence: true,

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
          },
        },
      }),

      prisma.operationalNotification.count({
        where: { userId },
      }),

      prisma.operationalNotification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
        },
      }),

      prisma.operationalNotification.count({
        where: {
          userId,
          severity: NotificationSeverity.CRITICAL,
          status: {
            not: NotificationStatus.DISMISSED,
          },
        },
      }),

      prisma.operationalNotification.count({
        where: {
          userId,
          status: NotificationStatus.ACKNOWLEDGED,
        },
      }),
    ]);

    response.status(200).json({
      data: {
        generatedAt: new Date().toISOString(),

        metrics: {
          total,
          unread,
          critical,
          acknowledged,
        },

        notifications,
      },
    });
  }),
);

notificationsRouter.patch(
  "/:notificationId/status",
  asyncHandler(async (request, response) => {
    const parsedParams =
      notificationParamsSchema.safeParse(
        request.params,
      );

    const parsedBody =
      notificationStatusSchema.safeParse(
        request.body,
      );

    if (!parsedParams.success) {
      sendValidationError(
        response,
        parsedParams.error,
      );
      return;
    }

    if (!parsedBody.success) {
      sendValidationError(
        response,
        parsedBody.error,
      );
      return;
    }

    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { userId } =
      authenticatedRequest.auth;

    const { notificationId } =
      parsedParams.data;

    const { status } = parsedBody.data;

    const notification =
      await prisma.operationalNotification.findFirst({
        where: {
          id: notificationId,
          userId,
        },
      });

    if (!notification) {
      response.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message:
            "The requested notification was not found.",
        },
      });
      return;
    }

    const now = new Date();

    const auditAction =
      status === NotificationStatus.ACKNOWLEDGED
        ? AuditAction.NOTIFICATION_ACKNOWLEDGED
        : status === NotificationStatus.DISMISSED
          ? AuditAction.NOTIFICATION_DISMISSED
          : AuditAction.NOTIFICATION_READ;

    const updatedNotification =
      await prisma.$transaction(
        async (transaction) => {
          const updated =
            await transaction.operationalNotification.update({
              where: {
                id: notificationId,
              },

              data: {
                status,

                readAt:
                  status === NotificationStatus.UNREAD
                    ? null
                    : notification.readAt ?? now,

                acknowledgedAt:
                  status ===
                  NotificationStatus.ACKNOWLEDGED
                    ? now
                    : notification.acknowledgedAt,

                dismissedAt:
                  status ===
                  NotificationStatus.DISMISSED
                    ? now
                    : notification.dismissedAt,
              },

              include: {
                sourceRecommendation: true,
              },
            });

          await transaction.auditLog.create({
            data: {
              actorId: userId,
              action: auditAction,
              entityType:
                "OperationalNotification",
              entityId: notificationId,
              ipAddress: request.ip ?? null,
              userAgent:
                request.get("user-agent") ?? null,

              metadata: {
                previousStatus:
                  notification.status,
                nextStatus: status,
              },
            },
          });

          return updated;
        },
      );

    response.status(200).json({
      data: {
        notification: updatedNotification,
      },
    });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (request, response) => {
    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { userId } =
      authenticatedRequest.auth;

    const now = new Date();

    const result = await prisma.$transaction(
      async (transaction) => {
        const update =
          await transaction.operationalNotification.updateMany({
            where: {
              userId,
              status: NotificationStatus.UNREAD,
            },

            data: {
              status: NotificationStatus.READ,
              readAt: now,
            },
          });

        await transaction.auditLog.create({
          data: {
            actorId: userId,
            action: AuditAction.NOTIFICATION_READ,
            entityType:
              "OperationalNotification",
            entityId: "bulk",
            ipAddress: request.ip ?? null,
            userAgent:
              request.get("user-agent") ?? null,

            metadata: {
              mode: "READ_ALL",
              count: update.count,
            },
          },
        });

        return update;
      },
    );

    response.status(200).json({
      data: {
        updated: result.count,
      },
    });
  }),
);