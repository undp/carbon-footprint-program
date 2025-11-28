import fp from "fastify-plugin";
import { PrismaClient, adapter, type Prisma } from "@repo/database";
import { FastifyInstance } from "fastify";

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

export default fp((fastify) => {
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
  prismaClient.$on("error", createLogHandler(fastify, "error", "Prisma Error"));

  // Log Prisma warnings
  prismaClient.$on("warn", createLogHandler(fastify, "warn", "Prisma Warning"));

  // Log Prisma info messages
  prismaClient.$on("info", createLogHandler(fastify, "info", "Prisma Info"));

  // Connect when server is ready
  fastify.addHook("onReady", async () => {
    await prismaClient.$connect();
    fastify.log.info("Prisma client connected to DB");
  });

  // Disconnect when server closes
  fastify.addHook("onClose", async () => {
    await prismaClient.$disconnect();
    fastify.log.info("Prisma client disconnected from DB");
  });

  fastify.decorate("prisma", prismaClient);
});
