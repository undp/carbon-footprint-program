import { getDashboardSectorChartHandler } from "./handler.js";
import {
  GetAdminDashboardSectorChartResponseSchema,
  GetAdminDashboardSectorChartQuerySchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardSectorChartRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/sector-chart",
    {
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
    },
    getDashboardSectorChartHandler
  );
};
