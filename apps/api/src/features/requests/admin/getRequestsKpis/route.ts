import { getRequestsKpisHandler } from "./handler.js";
import {
  GetAdminRequestsKpisResponseSchema,
  GetAdminRequestsKpisQuerySchema,
} from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getRequestsKpisRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin-requests"],
        summary: "Get request KPIs",
        description:
          "Get submission request statistics grouped by type and status",
        querystring: GetAdminRequestsKpisQuerySchema,
        response: {
          200: GetAdminRequestsKpisResponseSchema,
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
    getRequestsKpisHandler
  );
};
