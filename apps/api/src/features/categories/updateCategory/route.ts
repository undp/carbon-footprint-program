import { defineRoute } from "@/routing/defineRoute.js";
import { updateCategoryHandler } from "./handler.js";
import {
  UpdateCategoryParams,
  UpdateCategoryParamsSchema,
  UpdateCategoryRequest,
  UpdateCategoryRequestSchema,
  UpdateCategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateCategoryRoute = defineRoute<{
  Params: UpdateCategoryParams;
  Body: UpdateCategoryRequest;
}>({
  method: "PATCH",
  path: "/:id",
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
  access: { mode: "private" },
  handler: updateCategoryHandler,
});
