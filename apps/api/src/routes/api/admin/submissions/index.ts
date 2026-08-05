import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getSubmissionWarningsRoute } from "@/features/submissions/getSubmissionWarnings/route.js";
import { SystemRole } from "@repo/database";

export default function adminSubmissionsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getSubmissionWarningsRoute], {
    defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN],
  });
}
