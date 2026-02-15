import type { FastifyZodInstance } from "@/types/fastify.js";
import { getOrganizationKpisHandler } from "./handler.js";
import { GetOrganizationKpisResponseSchema } from "@repo/types";

export const getOrganizationKpisRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["admin-organizations"],
        summary: "Get organization KPIs",
        description:
          "Get organization statistics grouped by status, accreditation, and carbon inventories",
        response: {
          200: GetOrganizationKpisResponseSchema,
        },
      },
    },
    getOrganizationKpisHandler
  );
};
