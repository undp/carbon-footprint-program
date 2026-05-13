import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getEmissionFactorDimensionsRoute } from "@/features/emissionFactorDimensions/getEmissionFactorDimensions/route.js";
import { createEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/createEmissionFactorDimension/route.js";
import { updateEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/updateEmissionFactorDimension/route.js";
import { deleteEmissionFactorDimensionRoute } from "@/features/emissionFactorDimensions/deleteEmissionFactorDimension/route.js";

export default function emissionFactorDimensionsRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(fastify, [
    getEmissionFactorDimensionsRoute,
    createEmissionFactorDimensionRoute,
    updateEmissionFactorDimensionRoute,
    deleteEmissionFactorDimensionRoute,
  ]);
}
