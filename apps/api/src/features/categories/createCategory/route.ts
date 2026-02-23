import type { FastifyZodInstance } from "@/types/fastify.js";
import { createCategoryHandler } from "./handler.js";
import {
  CreateCategoryRequestSchema,
  CreateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createCategoryRoute = (fastify: FastifyZodInstance) => {
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
    },
    createCategoryHandler
  );
};
