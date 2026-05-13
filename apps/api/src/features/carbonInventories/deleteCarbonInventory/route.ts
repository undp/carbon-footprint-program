import { deleteCarbonInventoryHandler } from "./handler.js";
import {
  DeleteCarbonInventoryParams,
  DeleteCarbonInventoryParamsSchema,
  DeleteCarbonInventoryResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const deleteCarbonInventoryRoute = defineRoute<{
  Params: DeleteCarbonInventoryParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Delete a carbon inventory",
    description:
      "Soft-delete a carbon inventory by ID (sets status to DELETED)",
    params: DeleteCarbonInventoryParamsSchema,
    response: {
      200: DeleteCarbonInventoryResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "carbonInventory",
      carbonInventory: {
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: deleteCarbonInventoryHandler,
});
