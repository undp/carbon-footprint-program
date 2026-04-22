import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadRoute } from "./requestBadgeUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmBadgeUpload/route.js";
import { badgeGetFilesRoute } from "./getBadgeFiles/route.js";
import { SystemRole } from "@repo/types";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  // request-upload and confirm-upload require SUPERADMIN only
  fastify.register((f) => {
    f.addHook("preHandler", f.requireRoles([SystemRole.SUPERADMIN]));
    badgeRequestUploadRoute(f);
    badgeConfirmUploadRoute(f);
  });

  // getBadgeFiles retains the original [SUPERADMIN, ADMIN] policy
  fastify.register((f) => {
    f.addHook(
      "preHandler",
      f.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
    );
    badgeGetFilesRoute(f);
  });
}
