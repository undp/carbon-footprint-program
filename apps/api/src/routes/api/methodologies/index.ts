import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/getAllMethodologiesRoute.js";
import { createMethodologyRoute } from "@/features/methodologies/createMethodology/createMethodologyRoute.js";
import { updateMethodologyRoute } from "@/features/methodologies/updateMethodology/updateMethodologyRoute.js";
import { deleteMethodologyRoute } from "@/features/methodologies/deleteMethodology/deleteMethodologyRoute.js";
import { duplicateMethodologyRoute } from "@/features/methodologies/duplicateMethodology/duplicateMethodologyRoute.js";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  getAllMethodologiesRoute(fastify);
  createMethodologyRoute(fastify);
  updateMethodologyRoute(fastify);
  deleteMethodologyRoute(fastify);
  duplicateMethodologyRoute(fastify);
}
