import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { createReductionProjectRoute } from "@/features/reductionProjects/createReductionProject/route.js";
import { getAllReductionProjectsRoute } from "@/features/reductionProjects/getAllReductionProjects/route.js";
import { getReductionProjectsMinimalRoute } from "@/features/reductionProjects/getReductionProjectsMinimal/route.js";
import { getReductionProjectByIdRoute } from "@/features/reductionProjects/getReductionProjectById/route.js";
import { getReductionProjectAccessRoute } from "@/features/reductionProjects/getReductionProjectAccess/route.js";
import { updateReductionProjectRoute } from "@/features/reductionProjects/updateReductionProject/route.js";
import { requestReductionProjectVerificationRoute } from "@/features/reductionProjects/requestVerification/route.js";
import { deleteReductionProjectRoute } from "@/features/reductionProjects/deleteReductionProject/route.js";
import { SystemRole } from "@repo/types";

export default function reductionProjectsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      createReductionProjectRoute,
      getAllReductionProjectsRoute,
      getReductionProjectsMinimalRoute,
      getReductionProjectByIdRoute,
      getReductionProjectAccessRoute,
      updateReductionProjectRoute,
      requestReductionProjectVerificationRoute,
      deleteReductionProjectRoute,
    ],
    {
      defaultSystemRoles: [
        SystemRole.USER,
        SystemRole.ADMIN,
        SystemRole.SUPERADMIN,
      ],
    }
  );
}
