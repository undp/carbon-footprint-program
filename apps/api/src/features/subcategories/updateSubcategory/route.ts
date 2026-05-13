import { defineRoute } from "@/routing/defineRoute.js";
import { updateSubcategoryHandler } from "./handler.js";
import {
  UpdateSubcategoryParams,
  UpdateSubcategoryParamsSchema,
  UpdateSubcategoryRequest,
  UpdateSubcategoryRequestSchema,
  UpdateSubcategoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateSubcategoryRoute = defineRoute<{
  Params: UpdateSubcategoryParams;
  Body: UpdateSubcategoryRequest;
}>({
  method: "PATCH",
  path: "/:id",
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
  access: { mode: "private" },
  handler: updateSubcategoryHandler,
});
