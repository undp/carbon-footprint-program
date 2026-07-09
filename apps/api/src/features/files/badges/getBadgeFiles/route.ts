import {
  GetBadgeFilesParams,
  GetBadgeFilesParamsSchema,
  GetBadgeFilesQuery,
  GetBadgeFilesQuerySchema,
  GetBadgeFilesResponseSchema,
} from "@repo/types";
import { badgeGetFilesHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const badgeGetFilesRoute = defineRoute<{
  Params: GetBadgeFilesParams;
  Querystring: GetBadgeFilesQuery;
}>({
  method: "GET",
  path: "/:badgeType",
  schema: {
    tags: ["files"],
    summary: "List badge files by type",
    params: GetBadgeFilesParamsSchema,
    querystring: GetBadgeFilesQuerySchema,
    response: {
      200: GetBadgeFilesResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: badgeGetFilesHandler,
});
