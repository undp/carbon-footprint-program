import type { FastifyZodInstance } from "@/types/fastify.js";

import { CarbonInventoryAvailableYearsSchema } from "@repo/types";
import { getAvailableYearsHandler } from "./getAvailableYearsHandler.js";

export const getAvailableYearsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/available-years",
    {
      schema: {
        tags: ["carbon-inventories-available-years"],
        summary: "Get carbon inventories available years",
        description:
          "Get all available years from carbon inventories ordered by creation date (newest first).",
        response: {
          200: CarbonInventoryAvailableYearsSchema,
        },
      },
    },
    getAvailableYearsHandler
  );
};
