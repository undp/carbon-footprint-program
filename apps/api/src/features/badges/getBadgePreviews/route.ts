import {
  GetBadgePreviewsResponseSchema,
  GetBadgePreviewsQuerySchema,
} from "@repo/types";
import { getBadgePreviewsHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getBadgePreviewsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/previews",
    {
      schema: {
        tags: ["badges"],
        summary: "Get badge previews",
        description:
          "Returns signed SAS URLs for each active badge type seal image.",
        querystring: GetBadgePreviewsQuerySchema,
        response: {
          200: GetBadgePreviewsResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getBadgePreviewsHandler
  );
};
