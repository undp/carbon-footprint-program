import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllEmissionFactorsRoute } from "@/features/emissionFactors/getAllEmissionFactors/route.js";
import { createEmissionFactorRoute } from "@/features/emissionFactors/createEmissionFactor/route.js";
import { updateEmissionFactorRoute } from "@/features/emissionFactors/updateEmissionFactor/route.js";
import { deleteEmissionFactorRoute } from "@/features/emissionFactors/deleteEmissionFactor/route.js";

export default function emissionFactorsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getAllEmissionFactorsRoute(fastify);
  createEmissionFactorRoute(fastify);
  updateEmissionFactorRoute(fastify);
  deleteEmissionFactorRoute(fastify);
}
