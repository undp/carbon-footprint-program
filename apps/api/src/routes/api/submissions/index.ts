import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryHistoryRoute } from "@/features/submissions/getCarbonInventoryHistory/route.js";
import { getOrganizationHistoryRoute } from "@/features/submissions/getOrganizationHistory/route.js";

export default function submissionRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getCarbonInventoryHistoryRoute(fastify);
  getOrganizationHistoryRoute(fastify);
}
