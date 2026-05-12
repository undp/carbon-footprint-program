import { StandardRouteSignature } from "@/routes/api/index.js";
import { createSubcategoryHandler } from "./handler.js";
import {
  CreateSubcategoryRequestSchema,
  CreateSubcategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createSubcategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["subcategories"],
        summary: "Create a subcategory",
        description: "Create a new subcategory within a category",
        body: CreateSubcategoryRequestSchema,
        response: {
          201: CreateSubcategoryResponseSchema,
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
    createSubcategoryHandler
  );
};
