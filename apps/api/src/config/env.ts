import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  API_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),

  WEB_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:5173"),

  AGENT_SERVICE_URL: z
    .string()
    .url()
    .default("http://localhost:8000"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(
      32,
      "JWT_SECRET must contain at least 32 characters",
    ),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default("15m"),

  JWT_REFRESH_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(7),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid API environment configuration:",
    result.error.flatten().fieldErrors,
  );

  throw new Error(
    "NERVE API environment configuration is invalid.",
  );
}

const values = result.data;

export const env = {
  nodeEnv: values.NODE_ENV,
  port: values.API_PORT,
  webOrigin: values.WEB_ORIGIN,
  agentServiceUrl: values.AGENT_SERVICE_URL,
  databaseUrl: values.DATABASE_URL,
  jwtSecret: values.JWT_SECRET,
  jwtAccessExpiresIn: values.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshDays: values.JWT_REFRESH_DAYS,
  isProduction: values.NODE_ENV === "production",
} as const;