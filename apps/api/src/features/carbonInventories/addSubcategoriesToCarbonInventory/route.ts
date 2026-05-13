import { addSubcategoriesToCarbonInventoryHandler } from "./handler.js";
import {
  AddSubcategoriesToCarbonInventoryBody,
  AddSubcategoriesToCarbonInventoryBodySchema,
  AddSubcategoriesToCarbonInventoryParams,
  AddSubcategoriesToCarbonInventoryParamsSchema,
  AddSubcategoriesToCarbonInventoryResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const addSubcategoriesToCarbonInventoryRoute = defineRoute<{
  Params: AddSubcategoriesToCarbonInventoryParams;
  Body: AddSubcategoriesToCarbonInventoryBody;
}>({
  method: "POST",
  path: "/:id/subcategories/add",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Add subcategories to a carbon inventory",
    description:
      "Add one or more subcategories to a carbon inventory by creating empty ACTIVE lines. Ignores subcategories that already have ACTIVE lines.",
    params: AddSubcategoriesToCarbonInventoryParamsSchema,
    body: AddSubcategoriesToCarbonInventoryBodySchema,
    response: {
      200: AddSubcategoriesToCarbonInventoryResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: {
      requiredOrganizationRoles: [
        OrganizationRole.CONTRIBUTOR,
        OrganizationRole.ADMIN,
      ],
    },
  },
  handler: addSubcategoriesToCarbonInventoryHandler,
});
