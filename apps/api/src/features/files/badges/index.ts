import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadRoute } from "./requestBadgeUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmBadgeUpload/route.js";
import { badgeGetFilesRoute } from "./getBadgeFiles/route.js";
import { SystemRole } from "@repo/types";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  badgeRequestUploadRoute(fastify);
  badgeConfirmUploadRoute(fastify);
  badgeGetFilesRoute(fastify);
}
