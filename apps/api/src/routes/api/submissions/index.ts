import type { FastifyZodInstance } from "@/types/fastify.js";
import { getSubmissionHistoryRoute } from "@/features/submissions/getSubmissionHistory/route.js";

export default function submissionRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getSubmissionHistoryRoute(fastify);
}
