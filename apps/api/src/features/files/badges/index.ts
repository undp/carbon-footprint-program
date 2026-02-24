import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeRequestUploadRoute } from "./requestBadgeUpload/route.js";
import { badgeConfirmUploadRoute } from "./confirmBadgeUpload/route.js";
import { badgeGetFilesRoute } from "./getBadgeFiles/route.js";

export default function badgeRoutes(fastify: FastifyZodInstance) {
  badgeRequestUploadRoute(fastify);
  badgeConfirmUploadRoute(fastify);
  badgeGetFilesRoute(fastify);
}
