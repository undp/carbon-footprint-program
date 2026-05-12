import { getDashboardKpisHandler } from "./handler.js";
import {
  GetAdminDashboardKpisResponseSchema,
  GetAdminDashboardKpisQuerySchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getDashboardKpisRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/kpis",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getDashboardKpisHandler
  );
};
