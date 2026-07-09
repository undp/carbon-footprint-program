import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllRequestsRoute } from "@/features/requests/admin/getAllRequests/route.js";
import { getRequestsKpisRoute } from "@/features/requests/admin/getRequestsKpis/route.js";
import { approveRequestRoute } from "@/features/requests/admin/approveRequest/route.js";
import { rejectRequestRoute } from "@/features/requests/admin/rejectRequest/route.js";
import { SystemRole } from "@repo/database";
import { reviewSubmissionRoute } from "@/features/requests/admin/reviewSubmission/route.js";

export default function adminRequestsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getRequestsKpisRoute,
      getAllRequestsRoute,
      approveRequestRoute,
      rejectRequestRoute,
      reviewSubmissionRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
