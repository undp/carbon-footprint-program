import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionFactorDimensionsRoute } from "@/features/emissionFactorDimensions/getEmissionFactorDimensions/route.js";
import { upsertEmissionFactorDimensionsRoute } from "@/features/emissionFactorDimensions/upsertEmissionFactorDimensions/route.js";

export default function emissionFactorDimensionsRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getEmissionFactorDimensionsRoute(fastify);
  upsertEmissionFactorDimensionsRoute(fastify);
}
