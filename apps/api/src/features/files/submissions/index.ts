import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionRequestUploadRoute } from "./requestSubmissionUpload/route.js";
import { submissionConfirmUploadRoute } from "./confirmSubmissionUpload/route.js";
import { submissionGetFilesRoute } from "./getSubmissionFiles/route.js";

export default function submissionsPlugin(fastify: FastifyZodInstance) {
  submissionRequestUploadRoute(fastify);
  submissionConfirmUploadRoute(fastify);
  submissionGetFilesRoute(fastify);
}
