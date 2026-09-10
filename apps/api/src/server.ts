import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(
  env.port,
  () => {
    console.log(
      `NERVE API listening on http://localhost:${env.port}`,
    );
  },
);

let shutdownStarted = false;

async function shutdown(
  signal: string,
): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  console.log(
    `${signal} received. Closing NERVE API.`,
  );

  server.close(async () => {
    try {
      await prisma.$disconnect();

      console.log(
        "Database connection closed.",
      );

      process.exit(0);
    } catch (error) {
      console.error(
        "Database shutdown failed:",
        error,
      );

      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error(
      "Forced shutdown after timeout.",
    );

    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "Unhandled promise rejection:",
      error,
    );

    void shutdown(
      "UNHANDLED_REJECTION",
    );
  },
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Uncaught exception:",
      error,
    );

    void shutdown(
      "UNCAUGHT_EXCEPTION",
    );
  },
);