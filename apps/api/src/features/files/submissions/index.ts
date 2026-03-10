import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionGetFilesRoute } from "./getSubmissionFiles/route.js";

export default function submissionsFilesRoutes(fastify: FastifyZodInstance) {
  submissionGetFilesRoute(fastify);
}
