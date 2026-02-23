import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionRequestUploadRoute } from "./requestUpload/route.js";
import { submissionConfirmUploadRoute } from "./confirmUpload/route.js";
import { submissionGetFilesRoute } from "./getFiles/route.js";

export default function submissionsPlugin(fastify: FastifyZodInstance) {
  submissionRequestUploadRoute(fastify);
  submissionConfirmUploadRoute(fastify);
  submissionGetFilesRoute(fastify);
}
