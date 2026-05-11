import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/route.js";
import { getMethodologyByIdRoute } from "@/features/methodologies/getMethodologyById/route.js";
import { getMethodologyExportRoute } from "@/features/methodologies/getMethodologyExport/route.js";
import { createMethodologyRoute } from "@/features/methodologies/createMethodology/route.js";
import { updateMethodologyRoute } from "@/features/methodologies/updateMethodology/route.js";
import { deleteMethodologyRoute } from "@/features/methodologies/deleteMethodology/route.js";
import { duplicateMethodologyRoute } from "@/features/methodologies/duplicateMethodology/route.js";
import { SystemRole } from "@repo/types";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  getAllMethodologiesRoute(fastify);
  getMethodologyByIdRoute(fastify);
  getMethodologyExportRoute(fastify);
  createMethodologyRoute(fastify);
  updateMethodologyRoute(fastify);
  deleteMethodologyRoute(fastify);
  duplicateMethodologyRoute(fastify);
}
