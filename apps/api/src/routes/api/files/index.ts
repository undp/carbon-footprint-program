import type { FastifyZodInstance } from "@/types/fastify.js";
import { uploadFileRoute } from "@/features/files/uploadFile/route.js";

export default function filesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  uploadFileRoute(fastify);
}
