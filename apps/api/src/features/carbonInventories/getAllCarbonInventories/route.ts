import { getAllCarbonInventoriesHandler } from "./handler.js";
import {
  GetAllCarbonInventoriesQuerySchema,
  GetAllCarbonInventoriesResponseSchema,
} from "@repo/types";
import type { GetAllCarbonInventoriesQuery } from "@repo/types";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllCarbonInventoriesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Querystring: GetAllCarbonInventoriesQuery }>(
    "/",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get all carbon inventories",
        description:
          "Get all carbon inventories ordered by creation date (newest first). Optional parameter: year (e.g., ?year=2024)",
        querystring: GetAllCarbonInventoriesQuerySchema,
        response: {
          200: GetAllCarbonInventoriesResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllCarbonInventoriesHandler
  );
};
