import type { FastifyZodInstance } from "@/types/fastify.js";
import { APP_VERSION } from "@/config/environment.js";

/**
 * Health check endpoint for monitoring and load balancers
 */
export default function healthRoutes(fastify: FastifyZodInstance) {
  fastify.get("/health", async (_request, reply) => {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const version = APP_VERSION ?? "unknown";

    // Check if Prisma is connected by doing a simple query
    try {
      // Prisma is essential for the API - if not available, fail the health check
      if (!fastify.prisma) {
        fastify.log.error("Health check failed - Prisma not configured");
        return reply.status(503).send({
          status: "degraded",
          version,
          timestamp,
          uptime,
          database: "not configured",
          error: "Database connection not configured",
        });
      }

      // Execute a minimal query to verify database connectivity
      await fastify.prisma.$queryRaw`SELECT 1`;

      return reply.status(200).send({
        status: "ok",
        version,
        timestamp,
        uptime,
        database: "connected",
      });
    } catch (error) {
      // Database connection failed
      fastify.log.error(
        { error },
        "Health check failed - database not available"
      );

      return reply.status(503).send({
        status: "degraded",
        version,
        timestamp,
        uptime,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
