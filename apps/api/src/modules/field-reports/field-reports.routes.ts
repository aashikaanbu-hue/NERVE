import {
  AgentRunStatus,
  AgentType,
  Prisma,
  ToolCallStatus,
  UserRole,
  VerificationStatus,
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
  analyseFieldEvidence,
} from "../../lib/agent-service.js";
import {
  processImpactAfterSense,
} from "../../lib/impact-workflow.js";
import {
  processRouteAfterImpact,
} from "../../lib/route-workflow.js";
import {
  processCommandAfterRoute,
} from "../../lib/command-workflow.js";
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
      message: "The supplied field report data is invalid.",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
}

function sendForbidden(response: Response): void {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    },
  });
}

function sendNotFound(response: Response): void {
  response.status(404).json({
    error: {
      code: "FIELD_REPORT_NOT_FOUND",
      message: "The requested field report was not found.",
    },
  });
}

const fieldReportQuerySchema = z.object({
  status: z
    .enum([
      "ALL",
      VerificationStatus.PENDING,
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED,
    ])
    .default("ALL"),

  corridorId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),
});

const fieldReportParamsSchema = z.object({
  fieldReportId: z.string().uuid(),
});

const createFieldReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3)
    .max(160),

  description: z
    .string()
    .trim()
    .min(10)
    .max(2000),

  latitude: z.coerce
    .number()
    .min(-90)
    .max(90),

  longitude: z.coerce
    .number()
    .min(-180)
    .max(180),

  corridorId: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  roadSegmentId: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  incidentId: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  mediaUrls: z
    .array(
      z.string().trim().min(1).max(2048),
    )
    .max(8)
    .default([]),

  capturedAt: z.coerce
    .date()
    .optional(),
});

const verificationSchema = z.object({
  status: z.enum([
    VerificationStatus.VERIFIED,
    VerificationStatus.REJECTED,
  ]),
});

function canViewEveryReport(role: UserRole): boolean {
  return (
    role === UserRole.GOVERNMENT_AUTHORITY ||
    role === UserRole.LOGISTICS_OPERATOR
  );
}

export const fieldReportsRouter = Router();

fieldReportsRouter.use(requireAuthentication);

fieldReportsRouter.get(
  "/summary",
  asyncHandler(async (request, response) => {
    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { userId, role } =
      authenticatedRequest.auth;

    const accessFilter: Prisma.FieldReportWhereInput =
      canViewEveryReport(role)
        ? {}
        : {
            reportedById: userId,
          };

    const [
      total,
      pending,
      verified,
      rejected,
      withMedia,
    ] = await Promise.all([
      prisma.fieldReport.count({
        where: accessFilter,
      }),

      prisma.fieldReport.count({
        where: {
          ...accessFilter,
          verificationStatus:
            VerificationStatus.PENDING,
        },
      }),

      prisma.fieldReport.count({
        where: {
          ...accessFilter,
          verificationStatus:
            VerificationStatus.VERIFIED,
        },
      }),

      prisma.fieldReport.count({
        where: {
          ...accessFilter,
          verificationStatus:
            VerificationStatus.REJECTED,
        },
      }),

      prisma.fieldReport.count({
        where: {
          ...accessFilter,
          mediaUrls: {
            isEmpty: false,
          },
        },
      }),
    ]);

    response.json({
      data: {
        total,
        pending,
        verified,
        rejected,
        withMedia,
      },
    });
  }),
);

fieldReportsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const parsedQuery =
      fieldReportQuerySchema.safeParse(request.query);

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
      corridorId,
      incidentId,
      limit,
    } = parsedQuery.data;

    const where: Prisma.FieldReportWhereInput = {
      ...(canViewEveryReport(role)
        ? {}
        : {
            reportedById: userId,
          }),

      ...(status === "ALL"
        ? {}
        : {
            verificationStatus: status,
          }),

      ...(corridorId
        ? {
            corridorId,
          }
        : {}),

      ...(incidentId
        ? {
            incidentId,
          }
        : {}),
    };

    const reports =
      await prisma.fieldReport.findMany({
        where,

        include: {
          corridor: true,
          roadSegment: true,
          incident: true,
        },

        orderBy: [
          {
            capturedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: limit,
      });

    response.json({
      data: {
        reports,
        total: reports.length,
        filters: {
          status,
          corridorId: corridorId ?? null,
          incidentId: incidentId ?? null,
        },
      },
    });
  }),
);

fieldReportsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const parsedBody =
      createFieldReportSchema.safeParse(
        request.body,
      );

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

    const {
      title,
      description,
      latitude,
      longitude,
      corridorId,
      roadSegmentId,
      incidentId,
      mediaUrls,
      capturedAt,
    } = parsedBody.data;

    const report =
      await prisma.fieldReport.create({
        data: {
          reportedById: userId,
          title,
          description,
          latitude,
          longitude,
          corridorId: corridorId ?? null,
          roadSegmentId:
            roadSegmentId ?? null,
          incidentId: incidentId ?? null,
          mediaUrls,
          capturedAt:
            capturedAt ?? new Date(),
          verificationStatus:
            VerificationStatus.PENDING,
        },

        include: {
          corridor: true,
          roadSegment: true,
          incident: true,
        },
      });

    response.status(201).json({
      data: {
        report,
        sync: {
          status: "SYNCED",
          syncedAt: new Date().toISOString(),
        },
      },
    });
  }),
);

fieldReportsRouter.get(
  "/:fieldReportId",
  asyncHandler(async (request, response) => {
    const parsedParams =
      fieldReportParamsSchema.safeParse(
        request.params,
      );

    if (!parsedParams.success) {
      sendValidationError(
        response,
        parsedParams.error,
      );
      return;
    }

    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { userId, role } =
      authenticatedRequest.auth;

    const { fieldReportId } =
      parsedParams.data;

    const report =
      await prisma.fieldReport.findUnique({
        where: {
          id: fieldReportId,
        },

        include: {
          corridor: true,
          roadSegment: true,
          incident: true,
        },
      });

    if (!report) {
      sendNotFound(response);
      return;
    }

    if (
      !canViewEveryReport(role) &&
      report.reportedById !== userId
    ) {
      sendForbidden(response);
      return;
    }

    response.json({
      data: {
        report,
      },
    });
  }),
);

fieldReportsRouter.patch(
  "/:fieldReportId/verification",
  asyncHandler(async (request, response) => {
    const parsedParams =
      fieldReportParamsSchema.safeParse(
        request.params,
      );

    if (!parsedParams.success) {
      sendValidationError(
        response,
        parsedParams.error,
      );
      return;
    }

    const parsedBody =
      verificationSchema.safeParse(
        request.body,
      );

    if (!parsedBody.success) {
      sendValidationError(
        response,
        parsedBody.error,
      );
      return;
    }

    const authenticatedRequest =
      request as AuthenticatedRequest;

    const { role } =
      authenticatedRequest.auth;

    if (
      role !==
      UserRole.GOVERNMENT_AUTHORITY
    ) {
      sendForbidden(response);
      return;
    }

    const { fieldReportId } =
      parsedParams.data;

    const existingReport =
      await prisma.fieldReport.findUnique({
        where: {
          id: fieldReportId,
        },

        select: {
          id: true,
          verificationStatus: true,
        },
      });

    if (!existingReport) {
      sendNotFound(response);
      return;
    }

    const shouldQueueSenseAgent =
      parsedBody.data.status ===
        VerificationStatus.VERIFIED &&
      existingReport.verificationStatus !==
        VerificationStatus.VERIFIED;

    const {
      report,
      agentRun,
    } = await prisma.$transaction(
      async (transaction) => {
        const updatedReport =
          await transaction.fieldReport.update({
            where: {
              id: fieldReportId,
            },

            data: {
              verificationStatus:
                parsedBody.data.status,
            },

            include: {
              corridor: true,
              roadSegment: true,
              incident: true,
            },
          });

        const queuedAgentRun =
          shouldQueueSenseAgent
            ? await transaction.agentRun.create({
                data: {
                  agentType:
                    AgentType.SENSE,

                  status:
                    AgentRunStatus.QUEUED,

                  trigger:
                    "VERIFIED_FIELD_REPORT",

                  inputSnapshot: {
                    source:
                      "FIELD_EVIDENCE",

                    fieldReportId:
                      updatedReport.id,

                    title:
                      updatedReport.title,

                    description:
                      updatedReport.description,

                    location: {
                      latitude:
                        updatedReport.latitude,

                      longitude:
                        updatedReport.longitude,
                    },

                    mediaUrls:
                      updatedReport.mediaUrls,

                    corridorId:
                      updatedReport.corridorId,

                    roadSegmentId:
                      updatedReport.roadSegmentId,

                    incidentId:
                      updatedReport.incidentId,

                    capturedAt:
                      updatedReport.capturedAt.toISOString(),

                    verifiedAt:
                      new Date().toISOString(),
                  } as Prisma.InputJsonValue,
                },
              })
            : null;

        return {
          report: updatedReport,
          agentRun: queuedAgentRun,
        };
      },
    );

    let processedAgentRun =
      agentRun;

    if (agentRun) {
      try {
        await prisma.agentRun.update({
          where: {
            id: agentRun.id,
          },

          data: {
            status:
              AgentRunStatus.RUNNING,

            startedAt:
              new Date(),

            errorMessage:
              null,
          },
        });

        const analysis =
          await analyseFieldEvidence({
            agentRunId:
              agentRun.id,

            fieldReportId:
              report.id,

            title:
              report.title,

            description:
              report.description,

            latitude:
  report.latitude.toNumber(),

            longitude:
  report.longitude.toNumber(),

            mediaUrls:
              report.mediaUrls,

            corridorId:
              report.corridorId,

            roadSegmentId:
              report.roadSegmentId,

            incidentId:
              report.incidentId,

            capturedAt:
              report.capturedAt.toISOString(),
          });

        processedAgentRun =
          await prisma.$transaction(
            async (transaction) => {
              await transaction.agentToolCall.createMany({
                data:
                  analysis.toolCalls.map(
                    (toolCall) => ({
                      agentRunId:
                        agentRun.id,

                      toolName:
                        toolCall.toolName,

                      status:
                        ToolCallStatus.SUCCEEDED,

                      request: {
                        fieldReportId:
                          report.id,
                      } as Prisma.InputJsonValue,

                      response:
                        toolCall.result as
                          Prisma.InputJsonValue,

                      completedAt:
                        new Date(),
                    }),
                  ),
              });

              return transaction.agentRun.update({
                where: {
                  id: agentRun.id,
                },

                data: {
                  status:
                    AgentRunStatus.COMPLETED,

                  outputSnapshot:
                    analysis as unknown as
                      Prisma.InputJsonValue,

                  completedAt:
                    new Date(),

                  errorMessage:
                    null,
                },
              });
            },
          );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown NERVE Sense error";

        processedAgentRun =
          await prisma.agentRun.update({
            where: {
              id: agentRun.id,
            },

            data: {
              status:
                AgentRunStatus.FAILED,

              errorMessage,

              completedAt:
                new Date(),
            },
          });
      }
    }

        let impactRun: Awaited<
      ReturnType<typeof processImpactAfterSense>
    > = null;

    let impactError: string | null = null;

    if (
      processedAgentRun?.status ===
      AgentRunStatus.COMPLETED
    ) {
      try {
        impactRun = await processImpactAfterSense(
          processedAgentRun.id,
        );

        impactError = impactRun?.errorMessage ?? null;
      } catch (error) {
        impactError =
          error instanceof Error
            ? error.message
            : "Impact handoff failed.";

        console.error(
          "NERVE Impact handoff failed:",
          impactError,
        );
      }
    }
        let routeRun: Awaited<
      ReturnType<typeof processRouteAfterImpact>
    > = null;

    let routeError: string | null = null;

    if (
      impactRun?.status ===
      AgentRunStatus.COMPLETED
    ) {
      try {
        routeRun =
          await processRouteAfterImpact(
            impactRun.id,
          );

        routeError =
          routeRun?.errorMessage ?? null;
      } catch (error) {
        routeError =
          error instanceof Error
            ? error.message
            : "Route handoff failed.";

        console.error(
          "NERVE Route handoff failed:",
          routeError,
        );
      }
    }
        let commandRun: Awaited<
      ReturnType<typeof processCommandAfterRoute>
    > = null;

    let commandError: string | null = null;

    if (
      routeRun?.status ===
      AgentRunStatus.COMPLETED
    ) {
      try {
        commandRun =
          await processCommandAfterRoute(
            routeRun.id,
          );

        commandError =
          commandRun?.errorMessage ?? null;
      } catch (error) {
        commandError =
          error instanceof Error
            ? error.message
            : "Command handoff failed.";

        console.error(
          "NERVE Command handoff failed:",
          commandError,
        );
      }
    }
    response.json({
      data: {
        report,
        agentRun: processedAgentRun,
        impactRun,
        impactError,
        routeRun,
        routeError,
        commandRun,
        commandError,

        decision: {
          status: report.verificationStatus,
          decidedAt: new Date().toISOString(),
        },
      },
    });
  }),
);