import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { getAllMagnitudesRoute } from "@/features/magnitudes/getAllMagnitudes/route.js";
import { createMagnitudeRoute } from "@/features/magnitudes/createMagnitude/route.js";
import { updateMagnitudeRoute } from "@/features/magnitudes/updateMagnitude/route.js";
import { deleteMagnitudeRoute } from "@/features/magnitudes/deleteMagnitude/route.js";

export default function magnitudesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );

  getAllMagnitudesRoute(fastify);
  createMagnitudeRoute(fastify);
  updateMagnitudeRoute(fastify);
  deleteMagnitudeRoute(fastify);
}
