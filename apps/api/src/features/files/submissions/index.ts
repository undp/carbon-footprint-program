import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionGetFilesRoute } from "./getSubmissionFiles/route.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";

export default function submissionsFilesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [submissionGetFilesRoute], {
    defaultSystemRoles: [
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ],
  });
}
