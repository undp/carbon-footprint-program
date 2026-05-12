import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllCountrySectorsHandler } from "./handler.js";
import { GetAllCountrySectorsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountrySectorsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-sectors"],
        summary: "Get all country sectors",
        description: "Retrieves all country sectors with their details",
        response: {
          200: GetAllCountrySectorsResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllCountrySectorsHandler
  );
};
