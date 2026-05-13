import { getDashboardKpisHandler } from "./handler.js";
import {
  GetAdminDashboardKpisQuery,
  GetAdminDashboardKpisQuerySchema,
  GetAdminDashboardKpisResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardKpisRoute = defineRoute<{
  Querystring: GetAdminDashboardKpisQuery;
}>({
  method: "GET",
  path: "/kpis",
  schema: {
    tags: ["admin-dashboard"],
    summary: "Get dashboard KPIs",
    description:
      "Get aggregated KPI data for the admin dashboard: organizations, emissions, and recognitions",
    querystring: GetAdminDashboardKpisQuerySchema,
    response: {
      200: GetAdminDashboardKpisResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getDashboardKpisHandler,
});
