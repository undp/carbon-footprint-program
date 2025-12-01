import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import registerApp from "@/app.js";
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
export async function createTestApp(databaseUrl: string) {
  // Create Fastify instance with minimal logging for tests
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validators
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Registrar el plugin de Prisma directamente con la URL de prueba
  await app.register(prismaPlugin, {
    databaseUrl: databaseUrl,
  });

  // Registrar el resto de la app (pero el plugin de Prisma ya está registrado)
  // Necesitarías modificar app.ts para que no registre Prisma si ya está decorado
  await app.register(registerApp);

  // Ready the app
  await app.ready();

  // Get Prisma client from the app
  const prisma = app.prisma;

  return { app, prisma };
}

/**
 * Type helper for the test app
 */
export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
export type TestFastifyInstance = FastifyInstance;
