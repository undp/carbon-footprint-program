import {
  GetBadgePreviewsQuery,
  GetBadgePreviewsQuerySchema,
  GetBadgePreviewsResponseSchema,
} from "@repo/types";
import { getBadgePreviewsHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getBadgePreviewsRoute = defineRoute<{
  Querystring: GetBadgePreviewsQuery;
}>({
  method: "GET",
  path: "/previews",
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
  access: { mode: "public" },
  handler: getBadgePreviewsHandler,
});
