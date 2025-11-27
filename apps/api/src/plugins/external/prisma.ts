import fp from "fastify-plugin";
import fastifyPrisma from "@joggr/fastify-prisma";
import { prisma, type PrismaClient } from "@repo/database";

export default fp(async (fastify) => {
  await fastify.register(fastifyPrisma, { client: prisma });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
