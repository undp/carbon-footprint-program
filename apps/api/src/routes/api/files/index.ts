import type { FastifyZodInstance } from "@/types/fastify.js";
import badgeRoutes from "@/features/files/badges/index.js";
import submissionsRoutes from "@/features/files/submissions/index.js";
import { downloadFileRoute } from "@/features/files/downloadFile/route.js";
import { deleteFileRoute } from "@/features/files/deleteFile/route.js";
import { previewFileRoute } from "@/features/files/previewFile/route.js";

export default function filesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.register(badgeRoutes, { prefix: "/badge" });
  fastify.register(submissionsRoutes, { prefix: "/submission" });
  downloadFileRoute(fastify);
  deleteFileRoute(fastify);
  previewFileRoute(fastify);
}
