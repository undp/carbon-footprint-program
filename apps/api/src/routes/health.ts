import type { FastifyZodInstance } from "@/types/fastify.js";

/**
 * Health check endpoint for monitoring and load balancers
 */
export default function healthRoutes(fastify: FastifyZodInstance) {
  fastify.get("/health", async (_request, reply) => {
    // Check if Prisma is connected by doing a simple query
    try {
      // Prisma is essential for the API - if not available, fail the health check
      if (!fastify.prisma) {
        fastify.log.error("Health check failed - Prisma not configured");
        return reply.status(503).send({
          status: "degraded",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: "not configured",
          error: "Database connection not configured",
        });
      }

      // Execute a minimal query to verify database connectivity
      await fastify.prisma.$queryRaw`SELECT 1`;

      return reply.status(200).send({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
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
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
