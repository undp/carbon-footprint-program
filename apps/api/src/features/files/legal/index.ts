import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { requestLegalUploadRoute } from "./requestLegalUpload/route.js";
import { confirmLegalUploadRoute } from "./confirmLegalUpload/route.js";

export default function legalRoutes(fastify: FastifyZodInstance) {
  fastify.register((f) => {
    f.addHook(
      "preHandler",
      f.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
    );
    requestLegalUploadRoute(f);
    confirmLegalUploadRoute(f);
  });
}
