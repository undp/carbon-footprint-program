import { StandardRouteSignature } from "@/routes/api/index.js";
import { createEmissionFactorHandler } from "./handler.js";
import {
  CreateEmissionFactorRequestSchema,
  CreateEmissionFactorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createEmissionFactorRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["emission-factors"],
        summary: "Create an emission factor",
        description: "Create a new emission factor within a subcategory",
        body: CreateEmissionFactorRequestSchema,
        response: {
          201: CreateEmissionFactorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createEmissionFactorHandler
  );
};
