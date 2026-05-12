import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllEmissionFactorsHandler } from "./handler.js";
import {
  GetAllEmissionFactorsQuerySchema,
  GetAllEmissionFactorsResponseSchema,
} from "@repo/types";

export const getAllEmissionFactorsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Get all emission factors for a methodology version",
        description:
          "Get all active emission factors for a given methodology version, ordered by subcategory",
        querystring: GetAllEmissionFactorsQuerySchema,
        response: {
          200: GetAllEmissionFactorsResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllEmissionFactorsHandler
  );
};
