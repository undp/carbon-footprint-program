import { getRequestsKpisHandler } from "./handler.js";
import { GetAdminRequestsKpisResponseSchema } from "@repo/types";
import { YearQueryParamSchema } from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

export const getRequestsKpisRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin-requests"],
        summary: "Get request KPIs",
        description:
          "Get submission request statistics grouped by type and status",
        querystring: z.object({ year: YearQueryParamSchema }),
        response: {
          200: GetAdminRequestsKpisResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    getRequestsKpisHandler
  );
};
