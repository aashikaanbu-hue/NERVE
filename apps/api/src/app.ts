import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";

import {
  errorHandler,
  notFound,
} from "./middleware/error-handler.js";

import {
  authRouter,
} from "./modules/auth/auth.routes.js";

import {
  healthRouter,
} from "./modules/health/health.routes.js";

import {
  operationsRouter,
} from "./modules/operations/operations.routes.js";

export const app = express();

app.disable("x-powered-by");

app.set(
  "trust proxy",
  env.isProduction ? 1 : false,
);

app.use(helmet());

app.use(
  cors({
    origin: env.webOrigin,
    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

app.use(cookieParser());

app.use(
  morgan(
    env.isProduction
      ? "combined"
      : "dev",
  ),
);

app.get(
  "/",
  (_request, response) => {
    response.status(200).json({
      name: "NERVE API",
      version: "0.1.0",
      environment: env.nodeEnv,

      endpoints: {
        health:
          "/api/v1/health",

        login:
          "/api/v1/auth/login",

        refresh:
          "/api/v1/auth/refresh",

        logout:
          "/api/v1/auth/logout",

        currentUser:
          "/api/v1/auth/me",

        operationsOverview:
          "/api/v1/operations/overview",

        corridors:
          "/api/v1/operations/corridors",

        incidents:
          "/api/v1/operations/incidents",

        deliveries:
          "/api/v1/operations/deliveries",

        recommendations:
          "/api/v1/operations/recommendations",

        agentRuns:
          "/api/v1/operations/agent-runs",
      },
    });
  },
);

app.use(
  "/api/v1/health",
  healthRouter,
);

app.use(
  "/api/v1/auth",
  authRouter,
);

app.use(
  "/api/v1/operations",
  operationsRouter,
);

app.use(notFound);
app.use(errorHandler);