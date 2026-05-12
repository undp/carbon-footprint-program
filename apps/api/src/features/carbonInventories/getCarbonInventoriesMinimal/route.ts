import {
  GetCarbonInventoriesMinimalParamsSchema,
  GetCarbonInventoriesMinimalResponseSchema,
} from "@repo/types";
import { getCarbonInventoriesMinimalHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getCarbonInventoriesMinimalRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/minimal",
    {
      schema: {
        tags: ["carbon-inventories-minimal"],
        summary: "Get carbon inventories minimal",
        params: GetCarbonInventoriesMinimalParamsSchema,
        description:
          "Get carbon inventories by status, returning only id, name, year and status. Ordered by status priority and year descending.",
        response: {
          200: GetCarbonInventoriesMinimalResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getCarbonInventoriesMinimalHandler
  );
};
