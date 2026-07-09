import { getDashboardSectorChartHandler } from "./handler.js";
import {
  GetAdminDashboardSectorChartQuery,
  GetAdminDashboardSectorChartQuerySchema,
  GetAdminDashboardSectorChartResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardSectorChartRoute = defineRoute<{
  Querystring: GetAdminDashboardSectorChartQuery;
}>({
  method: "GET",
  path: "/sector-chart",
  schema: {
    tags: ["admin-dashboard"],
    summary: "Get sector chart data",
    description:
      "Get top-N organizations count and emissions per sector for the admin dashboard",
    querystring: GetAdminDashboardSectorChartQuerySchema,
    response: {
      200: GetAdminDashboardSectorChartResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getDashboardSectorChartHandler,
});
