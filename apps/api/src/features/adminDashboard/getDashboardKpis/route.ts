import { getDashboardKpisHandler } from "./handler.js";
import {
  AdminDashboardKpisQuerySchema,
  AdminDashboardKpisResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getDashboardKpisRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin-dashboard"],
        summary: "Get admin dashboard KPIs",
        description:
          "Get aggregated KPIs for the admin dashboard including organizations, emissions, recognitions, and submissions",
        querystring: AdminDashboardKpisQuerySchema,
        response: {
          200: AdminDashboardKpisResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getDashboardKpisHandler
  );
};
