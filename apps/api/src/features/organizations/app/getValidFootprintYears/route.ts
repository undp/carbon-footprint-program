import { getValidFootprintYearsHandler } from "./handler.js";
import {
  GetValidFootprintYearsParamsSchema,
  GetValidFootprintYearsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getValidFootprintYearsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:orgId/valid-footprint-years",
    {
      schema: {
        tags: ["organizations"],
        summary: "Get valid footprint years for an organization",
        description:
          "Returns the years for which the organization has active carbon inventories",
        params: GetValidFootprintYearsParamsSchema,
        response: {
          200: GetValidFootprintYearsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getValidFootprintYearsHandler
  );
};
