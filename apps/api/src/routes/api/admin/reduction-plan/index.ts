import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllReductionPlanInitiativesRoute } from "@/features/reductionPlanInitiatives/admin/getAllReductionPlanInitiatives/route.js";
import { createReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/createReductionPlanInitiative/route.js";
import { updateReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/updateReductionPlanInitiative/route.js";
import { deleteReductionPlanInitiativeRoute } from "@/features/reductionPlanInitiatives/admin/deleteReductionPlanInitiative/route.js";

export default function adminReductionPlanRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllReductionPlanInitiativesRoute,
      createReductionPlanInitiativeRoute,
      updateReductionPlanInitiativeRoute,
      deleteReductionPlanInitiativeRoute,
    ],
    { defaultSystemRoles: [SystemRole.ADMIN, SystemRole.SUPERADMIN] }
  );
}
