import type { FastifyZodInstance } from "@/types/fastify.js";
import { GetOrganizationsKpisHandler } from "./handler.js";
import { GetOrganizationsKpisResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const GetOrganizationsKpisRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin", "organizations"],
        summary: "Get organizations KPIs (admin)",
        description:
          "Retrieves organization KPIs: total, blocked, not accredited, and accredited counts.",
        response: {
          200: GetOrganizationsKpisResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    GetOrganizationsKpisHandler
  );
};
