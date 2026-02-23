import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCategoryHandler } from "./handler.js";
import {
  UpdateCategoryParamsSchema,
  UpdateCategoryRequestSchema,
  UpdateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateCategoryRoute = (fastify: FastifyZodInstance) => {
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
    },
    updateCategoryHandler
  );
};
