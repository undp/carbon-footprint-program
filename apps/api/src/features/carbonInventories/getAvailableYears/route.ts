import { CarbonInventoryAvailableYearsSchema } from "@repo/types";
import { getAvailableYearsHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAvailableYearsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
      config: {
        public: options?.public ?? false,
      },
    },
    getAvailableYearsHandler
  );
};
