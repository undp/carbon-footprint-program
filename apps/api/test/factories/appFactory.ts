import { createApp } from "../../src/app.js";
import prismaPlugin from "../../src/plugins/app/prisma.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(
  databaseUrl: string
): Promise<FastifyInstance> {
  const app = await createApp(false);
  app.log.level = "silent";
  await app.register(prismaPlugin, {
    databaseUrl: databaseUrl,
  });

  await app.ready();

  return app;
}
