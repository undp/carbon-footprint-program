import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAdminOrganizationsKpisHandler } from "./handler.js";
import { GetAdminOrganizationsKpisResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAdminOrganizationsKpisRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin", "organizations"],
        summary: "Get organizations KPIs (admin)",
        description:
          "Retrieves organization KPIs: total, blocked, not accredited, and accredited counts.",
        response: {
          200: GetAdminOrganizationsKpisResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getAdminOrganizationsKpisHandler
  );
};
