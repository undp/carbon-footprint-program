import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateCategoryHandler } from "./handler.js";
import {
  UpdateCategoryParamsSchema,
  UpdateCategoryRequestSchema,
  UpdateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateCategoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["categories"],
        summary: "Update a category",
        description: "Update an existing category by its ID",
        params: UpdateCategoryParamsSchema,
        body: UpdateCategoryRequestSchema,
        response: {
          200: UpdateCategoryResponseSchema,
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
    updateCategoryHandler
  );
};
