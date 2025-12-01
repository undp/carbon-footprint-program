import fp from "fastify-plugin";
import { PrismaClient, type Prisma } from "@repo/database";
import { FastifyInstance } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "@/config/environment.js";

interface PrismaPluginOptions {
  databaseUrl?: string; // optional: allows override for tests
}

// Helper function for Prisma log events
const createLogHandler = (
  fastify: FastifyInstance,
  logMethod: "error" | "warn" | "info",
  label: string
) => {
  return (e: Prisma.LogEvent) => {
    fastify.log[logMethod](
      {
        message: e.message,
        target: e.target,
      },
      label
    );
  };
};

export default fp<PrismaPluginOptions>(
  (fastify, opts) => {
    // avoid registering multiple times
    if (fastify.hasDecorator("prisma")) {
      return;
    }
    // create adapter with the provided URL or the environment variable
    const connectionString = opts.databaseUrl ?? DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Database URL is required. Provide databaseUrl in plugin options or set DATABASE_URL environment variable."
      );
    }
    const adapter = new PrismaPg({
      connectionString,
    });
    const prismaClient = new PrismaClient({
      adapter,
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
        { emit: "event", level: "info" },
      ],
    });

    prismaClient.$on("query", (e) => {
      fastify.log.debug(
        {
          query: e.query.replace(/"/g, ""),
          params: e.params,
          durationMs: e.duration,
        },
        "Prisma query"
      );
    });

    // Log Prisma errors
    prismaClient.$on(
      "error",
      createLogHandler(fastify, "error", "Prisma Error")
    );

    // Log Prisma warnings
    prismaClient.$on(
      "warn",
      createLogHandler(fastify, "warn", "Prisma Warning")
    );

    // Log Prisma info messages
    prismaClient.$on("info", createLogHandler(fastify, "info", "Prisma Info"));

    // Connect when server is ready
    fastify.addHook("onReady", async () => {
      try {
        await prismaClient.$connect();
        fastify.log.info("Prisma client connected to DB");
      } catch (error) {
        fastify.log.error({ error }, "Failed to connect Prisma client to DB");
        throw error; // Prevent app from starting if DB connection fails
      }
    });

    // Disconnect when server closes
    fastify.addHook("onClose", async () => {
      try {
        await prismaClient.$disconnect();
        fastify.log.info("Prisma client disconnected from DB");
      } catch (error) {
        fastify.log.error(
          { error },
          "Failed to disconnect Prisma client from DB"
        );
        // Don't rethrow here - allow graceful shutdown to continue
      }
    });

    fastify.decorate("prisma", prismaClient);
  },
  { name: "prisma-plugin" }
);
