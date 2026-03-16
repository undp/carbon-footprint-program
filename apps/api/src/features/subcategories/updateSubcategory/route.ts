import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateSubcategoryHandler } from "./handler.js";
import {
  UpdateSubcategoryParamsSchema,
  UpdateSubcategoryRequestSchema,
  UpdateSubcategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateSubcategoryRoute = (fastify: FastifyZodInstance) => {
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
    },
    updateSubcategoryHandler
  );
};
