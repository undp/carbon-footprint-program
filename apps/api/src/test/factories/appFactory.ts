import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import type { FastifyInstance } from "fastify";

/**
 * Creates a Fastify application instance configured for testing.
 * This factory sets up the app with all plugins and routes, but uses
 * a test database URL instead of the production one.
 *
 * @param databaseUrl - The database connection URL for testing
 * @returns Object containing the Fastify app instance and Prisma client
 */
export async function createTestApp(
  databaseUrl: string
): Promise<FastifyInstance> {
  // Create Fastify instance with minimal logging for tests
  const app = await createApp(false);
  app.log.level = "silent";
  // Registrar el plugin de Prisma directamente con la URL de prueba
  await app.register(prismaPlugin, {
    databaseUrl: databaseUrl,
  });

  // Ready the app
  await app.ready();

  return app;
}

/**
 * Type helper for the test app
 */
export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
export type TestFastifyInstance = FastifyInstance;
