import type { FastifyZodInstance } from "@/types/fastify.js";
import { uploadFileRoute } from "@/features/files/uploadFile/route.js";
import { getFilesRoute } from "@/features/files/getFiles/route.js";
import { downloadFileRoute } from "@/features/files/downloadFile/route.js";
import { deleteFileRoute } from "@/features/files/deleteFile/route.js";
import { previewFileRoute } from "@/features/files/previewFile/route.js";
import { requestUploadRoute } from "@/features/files/requestUpload/route.js";
import { confirmUploadRoute } from "@/features/files/confirmUpload/route.js";

export default function filesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  uploadFileRoute(fastify);
  getFilesRoute(fastify);
  downloadFileRoute(fastify);
  deleteFileRoute(fastify);
  previewFileRoute(fastify);
  requestUploadRoute(fastify);
  confirmUploadRoute(fastify);
}
