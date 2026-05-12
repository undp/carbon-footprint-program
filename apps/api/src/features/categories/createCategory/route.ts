import { StandardRouteSignature } from "@/routes/api/index.js";
import { createCategoryHandler } from "./handler.js";
import {
  CreateCategoryRequestSchema,
  CreateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createCategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["categories"],
        summary: "Create a new category",
        description: "Create a new category for a methodology version",
        body: CreateCategoryRequestSchema,
        response: {
          201: CreateCategoryResponseSchema,
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
    createCategoryHandler
  );
};
