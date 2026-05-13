import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { badgeRequestUploadRoute } from "./requestBadgeUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmBadgeUpload/route.js";
import { badgeGetFilesRoute } from "./getBadgeFiles/route.js";
import { SystemRole } from "@repo/types";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  // request-upload and confirm-upload require SUPERADMIN only
  registerRoutes(fastify, [badgeRequestUploadRoute, badgeConfirmUploadRoute], {
    defaultSystemRoles: [SystemRole.SUPERADMIN],
  });

  // getBadgeFiles retains the original [SUPERADMIN, ADMIN] policy
  registerRoutes(fastify, [badgeGetFilesRoute], {
    defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN],
  });
}
