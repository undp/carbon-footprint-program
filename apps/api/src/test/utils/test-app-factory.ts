import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { PrismaClient } from "@repo/database";
import { PrismaPg } from "@prisma/adapter-pg";
import registerApp from "@/app.js";
import type { FastifyInstance } from "fastify";

/**
 * Creates a Fastify application instance configured for testing.
 * This factory sets up the app with all plugins and routes, but uses
 * a test database URL instead of the production one.
 *
 * @param databaseUrl - The database connection URL for testing
 * @returns Object containing the Fastify app instance and Prisma client
 */
export async function createTestApp(databaseUrl: string) {
  // Set DATABASE_URL environment variable for the Prisma plugin
  // This ensures the plugin uses the test database
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  try {
    // Create Fastify instance with minimal logging for tests
    const app = Fastify({
      logger: false, // Disable logging in tests
    }).withTypeProvider<ZodTypeProvider>();

    // Set up Zod validators
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Register all plugins and routes (Prisma plugin will be registered here)
    await app.register(registerApp);

    // Ready the app (this triggers onReady hooks, including Prisma connection)
    await app.ready();

    // Get Prisma client from the app (decorated by the plugin)
    const prisma = app.prisma;

    return { app, prisma };
  } finally {
    // Restore original DATABASE_URL if it existed
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
}

/**
 * Type helper for the test app
 */
export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
export type TestFastifyInstance = FastifyInstance;
