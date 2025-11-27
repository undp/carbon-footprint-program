import { PrismaClient } from "@repo/database";
import type {
  FastifyInstance,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

/**
 * Tipo personalizado que representa una instancia de Fastify con ZodTypeProvider ya configurado.
 * Esto permite usar métodos como .get(), .post(), etc. directamente sin necesidad de llamar
 * .withTypeProvider<ZodTypeProvider>() en cada método.
 */
export type FastifyZodInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
