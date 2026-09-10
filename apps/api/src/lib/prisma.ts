import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalDatabase = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalDatabase.prisma ??
  new PrismaClient({
    log: env.isProduction
      ? ["error"]
      : ["query", "info", "warn", "error"],
  });

if (!env.isProduction) {
  globalDatabase.prisma = prisma;
}