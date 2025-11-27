import fp from "fastify-plugin";
import fastifyPrisma from "@joggr/fastify-prisma";
import { prisma, type PrismaClient } from "@repo/database";

interface PrismaPluginOptions {
  client: PrismaClient;
}

export const autoConfig: PrismaPluginOptions = {
  client: prisma,
};

export default fp<PrismaPluginOptions>(
  async (fastify, opts) => {
    await fastify.register(fastifyPrisma, opts);
  },
  { name: "prisma-plugin" }
);
