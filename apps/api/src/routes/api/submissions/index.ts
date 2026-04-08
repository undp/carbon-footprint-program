import type { FastifyZodInstance } from "@/types/fastify.js";
import { getSubmissionRecognitionFileRoute } from "@/features/submissions/getSubmissionRecognitionFile/route.js";
import { getCarbonInventoryHistoryRoute } from "@/features/submissions/getCarbonInventoryHistory/route.js";
import { getOrganizationHistoryRoute } from "@/features/submissions/getOrganizationHistory/route.js";
import { SystemRole } from "@repo/types";

export default function submissionsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ])
  );

  getSubmissionRecognitionFileRoute(fastify);
  getCarbonInventoryHistoryRoute(fastify);
  getOrganizationHistoryRoute(fastify);
}
