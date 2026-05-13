import { updateCarbonInventorySubcategoriesHandler } from "./handler.js";
import {
  UpdateCarbonInventorySubcategoriesParams,
  UpdateCarbonInventorySubcategoriesParamsSchema,
  UpdateCarbonInventorySubcategoriesRequest,
  UpdateCarbonInventorySubcategoriesRequestSchema,
  UpdateCarbonInventorySubcategoriesResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const updateCarbonInventorySubcategoriesRoute = defineRoute<{
  Params: UpdateCarbonInventorySubcategoriesParams;
  Body: UpdateCarbonInventorySubcategoriesRequest;
}>({
  method: "PATCH",
  path: "/:id/subcategories",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Update subcategories selection for a carbon inventory",
    description:
      "Add or remove subcategories from a carbon inventory. When removing a subcategory, it will only succeed if the subcategory has no non-empty lines. Empty lines will be deleted automatically.",
    params: UpdateCarbonInventorySubcategoriesParamsSchema,
    body: UpdateCarbonInventorySubcategoriesRequestSchema,
    response: {
      200: UpdateCarbonInventorySubcategoriesResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: {
      requiredOrganizationRoles: [
        OrganizationRole.CONTRIBUTOR,
        OrganizationRole.ADMIN,
      ],
    },
  },
  handler: updateCarbonInventorySubcategoriesHandler,
});
