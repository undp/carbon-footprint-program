import type { FastifyZodInstance } from "@/types/fastify.js";
import badgeRoutes from "@/features/files/badges/index.js";
import legalRoutes from "@/features/files/legal/index.js";
import submissionsFilesRoutes from "@/features/files/submissions/index.js";
import { downloadFileRoute } from "@/features/files/downloadFile/route.js";
import { deleteFileRoute } from "@/features/files/deleteFile/route.js";
import { previewFileRoute } from "@/features/files/previewFile/route.js";
import { requestUploadRoute } from "@/features/files/requestUpload/route.js";
import { confirmUploadRoute } from "@/features/files/confirmUpload/route.js";

export default function filesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.register(badgeRoutes, { prefix: "/badge" });
  fastify.register(legalRoutes, { prefix: "/legal" });
  fastify.register(submissionsFilesRoutes, { prefix: "/submission" });
  requestUploadRoute(fastify);
  confirmUploadRoute(fastify);
  downloadFileRoute(fastify);
  deleteFileRoute(fastify);
  previewFileRoute(fastify);
}
