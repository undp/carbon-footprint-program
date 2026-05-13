import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllExplanationsRoute } from "@/features/explanations/admin/getAllExplanations/route.js";
import { updateExplanationRoute } from "@/features/explanations/admin/updateExplanation/route.js";
import { SystemRole } from "@repo/database";

export default function adminExplanationsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getAllExplanationsRoute, updateExplanationRoute], {
    defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN],
  });
}
