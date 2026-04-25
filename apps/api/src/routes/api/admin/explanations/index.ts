import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllExplanationsRoute } from "@/features/explanations/admin/getAllExplanations/route.js";
import { updateExplanationRoute } from "@/features/explanations/admin/updateExplanation/route.js";
import { SystemRole } from "@repo/database";

export default function adminExplanationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );

  getAllExplanationsRoute(fastify);
  updateExplanationRoute(fastify);
}
