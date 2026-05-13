import { duplicateCarbonInventoryHandler } from "./handler.js";
import {
  DuplicateCarbonInventoryParams,
  DuplicateCarbonInventoryParamsSchema,
  DuplicateCarbonInventoryResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const duplicateCarbonInventoryRoute = defineRoute<{
  Params: DuplicateCarbonInventoryParams;
}>({
  method: "POST",
  path: "/:id/duplicate",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Duplicate a carbon inventory",
    description:
      "Duplicates a carbon inventory and all its ACTIVE children (lines, inputs, factors, results). Submissions are not duplicated.",
    params: DuplicateCarbonInventoryParamsSchema,
    response: {
      200: DuplicateCarbonInventoryResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "carbonInventory",
      options: {
        requiredOrganizationRoles: [
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.ADMIN,
        ],
      },
    },
  },
  handler: duplicateCarbonInventoryHandler,
});
