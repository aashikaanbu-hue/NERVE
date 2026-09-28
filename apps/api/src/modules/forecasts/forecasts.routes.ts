import {
  randomUUID,
} from "node:crypto";

import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";

import {
  analyseCorridorForecast,
  type CorridorForecastAnalysis,
} from "../../lib/agent-service.js";

import {
  prisma,
} from "../../lib/prisma.js";

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


type CorridorSummary = {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  status: string;
  storedRiskScore: number;
  latitude: number;
  longitude: number;
};


type ForecastEntry = {
  corridor: CorridorSummary;
  forecast:
    CorridorForecastAnalysis;
};


type UnavailableEntry = {
  corridor: {
    id: string;
    code: string;
    name: string;
  };

  reason: string;
};


export const forecastsRouter =
  Router();


forecastsRouter.use(
  requireAuthentication,
);


forecastsRouter.get(
  "/",
  asyncHandler(
    async (
      _request,
      response,
    ) => {
      const corridors =
        await prisma
          .roadCorridor
          .findMany({
            orderBy: {
              name: "asc",
            },

            include: {
              segments: {
                select: {
                  startLatitude:
                    true,

                  startLongitude:
                    true,

                  endLatitude:
                    true,

                  endLongitude:
                    true,
                },
              },
            },
          });

      const forecasts:
        ForecastEntry[] = [];

      const unavailable:
        UnavailableEntry[] = [];

      for (
        const corridor
        of corridors
      ) {
        const coordinates =
          corridor.segments
            .flatMap(
              (segment) => [
                {
                  latitude:
                    Number(
                      segment
                        .startLatitude,
                    ),

                  longitude:
                    Number(
                      segment
                        .startLongitude,
                    ),
                },

                {
                  latitude:
                    Number(
                      segment
                        .endLatitude,
                    ),

                  longitude:
                    Number(
                      segment
                        .endLongitude,
                    ),
                },
              ],
            )
            .filter(
              (coordinate) =>
                Number.isFinite(
                  coordinate
                    .latitude,
                ) &&
                Number.isFinite(
                  coordinate
                    .longitude,
                ),
            );

        if (
          coordinates.length ===
          0
        ) {
          unavailable.push({
            corridor: {
              id:
                corridor.id,

              code:
                corridor.code,

              name:
                corridor.name,
            },

            reason:
              "No segment coordinates are recorded for this corridor.",
          });

          continue;
        }

        const latitude =
          coordinates.reduce(
            (
              total,
              coordinate,
            ) =>
              total +
              coordinate.latitude,
            0,
          ) /
          coordinates.length;

        const longitude =
          coordinates.reduce(
            (
              total,
              coordinate,
            ) =>
              total +
              coordinate.longitude,
            0,
          ) /
          coordinates.length;

        const corridorSummary:
          CorridorSummary = {
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

            status:
              corridor.status,

            storedRiskScore:
              corridor.riskScore,

            latitude:
              Number(
                latitude.toFixed(
                  6,
                ),
              ),

            longitude:
              Number(
                longitude.toFixed(
                  6,
                ),
              ),
          };

        try {
          const forecast =
            await analyseCorridorForecast({
              agentRunId:
                randomUUID(),

              corridorId:
                corridor.id,

              corridorCode:
                corridor.code,

              corridorName:
                corridor.name,

              latitude:
                corridorSummary
                  .latitude,

              longitude:
                corridorSummary
                  .longitude,

              existingRiskScore:
                corridor.riskScore,

              // Neutral terrain baseline
              // until authoritative DEM
              // features are integrated.
              slopeSusceptibility:
                50,
            });

          forecasts.push({
            corridor:
              corridorSummary,

            forecast,
          });
        }
        catch (
          error: unknown
        ) {
          unavailable.push({
            corridor: {
              id:
                corridor.id,

              code:
                corridor.code,

              name:
                corridor.name,
            },

            reason:
              error instanceof Error
                ? error.message
                : "Forecast analysis failed.",
          });
        }
      }

      const watchOrAbove =
        forecasts.filter(
          ({ forecast }) =>
            forecast
              .assessmentStatus !==
            "NORMAL",
        ).length;

      response.json({
        data: {
          generatedAt:
            new Date()
              .toISOString(),

          source:
            "Open-Meteo Weather Forecast API",

          methodology:
            "weather-terrain-screening-v1",

          metrics: {
            totalCorridors:
              corridors.length,

            assessed:
              forecasts.length,

            unavailable:
              unavailable.length,

            watchOrAbove,
          },

          forecasts,
          unavailable,

          safeguards: {
            automaticRoadClosure:
              false,

            automaticRerouting:
              false,

            humanApprovalRequired:
              true,

            note:
              "Forecast scores are screening indicators, not calibrated landslide probabilities.",
          },
        },
      });
    },
  ),
);