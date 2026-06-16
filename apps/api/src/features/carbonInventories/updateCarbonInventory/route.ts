import { updateCarbonInventoryHandler } from "./handler.js";
import {
  UpdateCarbonInventoryParams,
  UpdateCarbonInventoryParamsSchema,
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const updateCarbonInventoryRoute = defineRoute<{
  Params: UpdateCarbonInventoryParams;
  Body: UpdateCarbonInventoryRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Update a carbon inventory",
    description: "Update any attributes of an existing carbon inventory by ID",
    params: UpdateCarbonInventoryParamsSchema,
    body: UpdateCarbonInventoryRequestSchema,
    response: {
      200: UpdateCarbonInventoryResponseSchema,
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
  handler: updateCarbonInventoryHandler,
});
