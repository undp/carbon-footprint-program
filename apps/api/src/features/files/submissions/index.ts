import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionGetFilesRoute } from "./getSubmissionFiles/route.js";
import { SystemRole } from "@repo/types";

export default function submissionsFilesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ])
  );
  submissionGetFilesRoute(fastify);
}
