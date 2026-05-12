import { getOrganizationKpisHandler } from "./handler.js";
import { GetOrganizationKpisResponseSchema } from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getOrganizationKpisRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getOrganizationKpisHandler
  );
};
