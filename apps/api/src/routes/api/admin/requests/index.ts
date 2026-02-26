import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllRequestsRoute } from "@/features/requests/admin/getAllRequests/route.js";
import { getRequestsKpisRoute } from "@/features/requests/admin/getRequestsKpis/route.js";
import { approveRequestRoute } from "@/features/requests/admin/approveRequest/route.js";
import { rejectRequestRoute } from "@/features/requests/admin/rejectRequest/route.js";
import { SystemRole } from "@repo/database";

export default function adminRequestsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  getRequestsKpisRoute(fastify);
  getAllRequestsRoute(fastify);
  approveRequestRoute(fastify);
  rejectRequestRoute(fastify);
}
