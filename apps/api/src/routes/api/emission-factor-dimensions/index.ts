import type { FastifyZodInstance } from "@/types/fastify.js";
import { getEmissionFactorDimensionsRoute } from "@/features/emissionFactorDimensions/getEmissionFactorDimensions/route.js";
import { createEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/createEmissionFactorDimension/route.js";
import { updateEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/updateEmissionFactorDimension/route.js";
import { deleteEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/deleteEmissionFactorDimension/route.js";

export default function emissionFactorDimensionsRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getEmissionFactorDimensionsRoute(fastify);
  createEmissionFactorDimensionRoute(fastify);
  updateEmissionFactorDimensionRoute(fastify);
  deleteEmissionFactorDimensionRoute(fastify);
}
