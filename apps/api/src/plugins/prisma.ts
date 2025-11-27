import fp from "fastify-plugin";
import { prisma, type PrismaClient } from "@repo/database";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register Prisma Client as a Fastify Plugin.
// EXPLANATION:
// This plugin attaches the Prisma Client instance to the Fastify server instance.
// We use the singleton instance exported from @repo/database to ensure we have
// a single instance of Prisma connected to the database, preventing connection
// pool exhaustion. We use 'fastify-plugin' to make sure the decoration is
// available globally.
// --------------------------------------------------------------------------------

export default fp(async (fastify) => {
  await prisma.$connect();

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (server) => {
    if (server.prisma) {
      await server.prisma.$disconnect();
    }
  });
});

// Add type definition for FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
