import type { FastifyZodInstance } from "@/types/fastify.js";
import { createReductionProjectRoute } from "@/features/reductionProjects/createReductionProject/route.js";
import { getAllReductionProjectsRoute } from "@/features/reductionProjects/getAllReductionProjects/route.js";
import { getReductionProjectsMinimalRoute } from "@/features/reductionProjects/getReductionProjectsMinimal/route.js";
import { getReductionProjectByIdRoute } from "@/features/reductionProjects/getReductionProjectById/route.js";
import { getReductionProjectAccessRoute } from "@/features/reductionProjects/getReductionProjectAccess/route.js";
import { updateReductionProjectRoute } from "@/features/reductionProjects/updateReductionProject/route.js";
import { SystemRole } from "@repo/types";

export default function reductionProjectsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.USER,
      SystemRole.ADMIN,
      SystemRole.SUPERADMIN,
    ])
  );

  createReductionProjectRoute(fastify);
  getAllReductionProjectsRoute(fastify);
  getReductionProjectsMinimalRoute(fastify);
  getReductionProjectByIdRoute(fastify);
  getReductionProjectAccessRoute(fastify);
  updateReductionProjectRoute(fastify);
}
