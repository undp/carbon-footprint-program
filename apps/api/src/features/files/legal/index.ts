import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { requestLegalUploadRoute } from "./requestLegalUpload/route.js";
import { confirmLegalUploadRoute } from "./confirmLegalUpload/route.js";

export default function legalRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [requestLegalUploadRoute, confirmLegalUploadRoute], {
    defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN],
  });
}
