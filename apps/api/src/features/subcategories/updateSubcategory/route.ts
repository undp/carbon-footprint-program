import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateSubcategoryHandler } from "./handler.js";
import {
  UpdateSubcategoryParamsSchema,
  UpdateSubcategoryRequestSchema,
  UpdateSubcategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateSubcategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["subcategories"],
        summary: "Update a subcategory",
        description: "Update an existing subcategory by its ID",
        params: UpdateSubcategoryParamsSchema,
        body: UpdateSubcategoryRequestSchema,
        response: {
          200: UpdateSubcategoryResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateSubcategoryHandler
  );
};
