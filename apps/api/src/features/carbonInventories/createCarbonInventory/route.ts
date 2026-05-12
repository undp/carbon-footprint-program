import { createCarbonInventoryHandler } from "./handler.js";
import {
  CreateCarbonInventoryRequestSchema,
  CreateCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const createCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Create a new carbon inventory",
        description: "Create a new carbon inventory with the provided data",
        body: CreateCarbonInventoryRequestSchema,
        response: {
          201: CreateCarbonInventoryResponseSchema,
          400: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createCarbonInventoryHandler
  );
};
