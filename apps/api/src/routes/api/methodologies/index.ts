import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/route.js";
import { createMethodologyRoute } from "@/features/methodologies/createMethodology/route.js";
import { updateMethodologyRoute } from "@/features/methodologies/updateMethodology/route.js";
import { deleteMethodologyRoute } from "@/features/methodologies/deleteMethodology/route.js";
import { duplicateMethodologyRoute } from "@/features/methodologies/duplicateMethodology/route.js";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  getAllMethodologiesRoute(fastify);
  createMethodologyRoute(fastify);
  updateMethodologyRoute(fastify);
  deleteMethodologyRoute(fastify);
  duplicateMethodologyRoute(fastify);
}
