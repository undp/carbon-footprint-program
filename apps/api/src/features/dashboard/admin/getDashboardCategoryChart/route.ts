import { getDashboardCategoryChartHandler } from "./handler.js";
import {
  GetAdminDashboardCategoryChartQuery,
  GetAdminDashboardCategoryChartQuerySchema,
  GetAdminDashboardCategoryChartResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardCategoryChartRoute = defineRoute<{
  Querystring: GetAdminDashboardCategoryChartQuery;
}>({
  method: "GET",
  path: "/category-chart",
  schema: {
    tags: ["admin-dashboard"],
    summary: "Get category chart data",
    description:
      "Get emissions distribution per category grouped by methodology for the admin dashboard",
    querystring: GetAdminDashboardCategoryChartQuerySchema,
    response: {
      200: GetAdminDashboardCategoryChartResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getDashboardCategoryChartHandler,
});
