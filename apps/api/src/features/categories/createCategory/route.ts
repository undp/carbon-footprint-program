import { defineRoute } from "@/routing/defineRoute.js";
import { createCategoryHandler } from "./handler.js";
import {
  CreateCategoryRequest,
  CreateCategoryRequestSchema,
  CreateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createCategoryRoute = defineRoute<{
  Body: CreateCategoryRequest;
}>({
  method: "POST",
  path: "/",
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
  access: { mode: "private" },
  handler: createCategoryHandler,
});
