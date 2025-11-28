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

    fastify.addHook("onReady", async () => {
      await opts.client.$connect();
    });

    fastify.addHook("onClose", async () => {
      await opts.client.$disconnect();
    });
  },
  { name: "prisma-plugin" }
);
