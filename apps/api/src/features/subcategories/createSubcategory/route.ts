import { defineRoute } from "@/routing/defineRoute.js";
import { createSubcategoryHandler } from "./handler.js";
import {
  CreateSubcategoryRequest,
  CreateSubcategoryRequestSchema,
  CreateSubcategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createSubcategoryRoute = defineRoute<{
  Body: CreateSubcategoryRequest;
}>({
  method: "POST",
  path: "/",
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
  access: { mode: "private" },
  handler: createSubcategoryHandler,
});
