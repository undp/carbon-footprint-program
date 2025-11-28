import fp from "fastify-plugin";
import { PrismaClient, adapter, type Prisma } from "@repo/database";

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
  prismaClient.$on("error", (e: Prisma.LogEvent) => {
    fastify.log.error(
      {
        message: e.message,
        target: e.target,
      },
      "Prisma Error"
    );
  });

  // Log Prisma warnings
  prismaClient.$on("warn", (e: Prisma.LogEvent) => {
    fastify.log.warn(
      {
        message: e.message,
        target: e.target,
      },
      "Prisma Warning"
    );
  });

  // Log Prisma info messages
  prismaClient.$on("info", (e: Prisma.LogEvent) => {
    fastify.log.info(
      {
        message: e.message,
        target: e.target,
      },
      "Prisma Info"
    );
  });

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
