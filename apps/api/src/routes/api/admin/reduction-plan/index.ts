import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { getAllReductionPlanInitiativesRoute } from "@/features/reductionPlanInitiatives/admin/getAllReductionPlanInitiatives/route.js";
import { createReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/createReductionPlanInitiative/route.js";
import { updateReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/updateReductionPlanInitiative/route.js";
import { deleteReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/deleteReductionPlanInitiative/route.js";

export default function adminReductionPlanRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])
  );
  getAllReductionPlanInitiativesRoute(fastify);
  createReductionPlanInitiativeRoute(fastify);
  updateReductionPlanInitiativeRoute(fastify);
  deleteReductionPlanInitiativeRoute(fastify);
}
