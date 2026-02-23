import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadRoute } from "./requestUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmUpload/route.js";
import { badgeGetFilesRoute } from "./getFiles/route.js";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  badgeRequestUploadRoute(fastify);
  badgeConfirmUploadRoute(fastify);
  badgeGetFilesRoute(fastify);
}
