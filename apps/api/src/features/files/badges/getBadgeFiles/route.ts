import {
  GetBadgeFilesParamsSchema,
  GetBadgeFilesQuerySchema,
  GetBadgeFilesResponseSchema,
} from "@repo/types";
import { badgeGetFilesHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeGetFilesRoute: StandardRouteSignature = (
  fastify,
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
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    badgeGetFilesHandler
  );
};
