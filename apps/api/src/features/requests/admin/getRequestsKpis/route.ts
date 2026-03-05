import { getRequestsKpisHandler } from "./handler.js";
import { GetAdminRequestsKpisResponseSchema } from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

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
        response: {
          200: GetAdminRequestsKpisResponseSchema,
        },
      },
    },
    getRequestsKpisHandler
  );
};
