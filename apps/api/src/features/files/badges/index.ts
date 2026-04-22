import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadRoute } from "./requestBadgeUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmBadgeUpload/route.js";
import { badgeGetFilesRoute } from "./getBadgeFiles/route.js";
import { SystemRole } from "@repo/types";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  // request-upload and confirm-upload are restricted to SUPERADMIN only
  fastify.register((superadminFastify) => {
    superadminFastify.addHook(
      "preHandler",
      superadminFastify.requireRoles([SystemRole.SUPERADMIN])
    );
    badgeRequestUploadRoute(superadminFastify);
    badgeConfirmUploadRoute(superadminFastify);
  });

  // getBadgeFiles allows SUPERADMIN and ADMIN
  fastify.register((adminFastify) => {
    adminFastify.addHook(
      "preHandler",
      adminFastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
    );
    badgeGetFilesRoute(adminFastify);
  });
}
