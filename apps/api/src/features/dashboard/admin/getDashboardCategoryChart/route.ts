import { getDashboardCategoryChartHandler } from "./handler.js";
import {
  GetAdminDashboardCategoryChartResponseSchema,
  GetAdminDashboardCategoryChartQuerySchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardCategoryChartRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/category-chart",
    {
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
    },
    getDashboardCategoryChartHandler
  );
};
