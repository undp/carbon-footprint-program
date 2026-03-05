import {
  GetBadgeFilesParamsSchema,
  GetBadgeFilesQuerySchema,
  GetBadgeFilesResponseSchema,
} from "@repo/types";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeGetFilesHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeGetFilesRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance,
  options
) => {
  fastify.get(
    "/:badgeType",
    {
      schema: {
        tags: ["files"],
        summary: "List badge files by type",
        params: GetBadgeFilesParamsSchema,
        querystring: GetBadgeFilesQuerySchema,
        response: {
          200: GetBadgeFilesResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    badgeGetFilesHandler
  );
};
