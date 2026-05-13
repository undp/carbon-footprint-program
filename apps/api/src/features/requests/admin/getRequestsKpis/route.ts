import { getRequestsKpisHandler } from "./handler.js";
import {
  GetAdminRequestsKpisQuery,
  GetAdminRequestsKpisQuerySchema,
  GetAdminRequestsKpisResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getRequestsKpisRoute = defineRoute<{
  Querystring: GetAdminRequestsKpisQuery;
}>({
  method: "GET",
  path: "/kpis",
  schema: {
    tags: ["admin-requests"],
    summary: "Get request KPIs",
    description: "Get submission request statistics grouped by type and status",
    querystring: GetAdminRequestsKpisQuerySchema,
    response: {
      200: GetAdminRequestsKpisResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getRequestsKpisHandler,
});
