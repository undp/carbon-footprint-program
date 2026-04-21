import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { getAllInitiativesRoute } from "@/features/reductionPlanInitiatives/admin/getAllInitiatives/route.js";
import { createInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/createInitiative/route.js";
import { updateInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/updateInitiative/route.js";
import { deleteInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/deleteInitiative/route.js";

export default function adminReductionPlanRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN])
  );
  getAllInitiativesRoute(fastify);
  createInitiativeRoute(fastify);
  updateInitiativeRoute(fastify);
  deleteInitiativeRoute(fastify);
}
