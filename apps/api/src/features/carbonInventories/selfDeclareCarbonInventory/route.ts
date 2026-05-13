import { selfDeclareCarbonInventoryHandler } from "./handler.js";
import {
  OrganizationRole,
  SelfDeclareCarboInventoryParamsSchema,
  SelfDeclareCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const selfDeclareCarbonInventoryRoute = defineRoute({
  method: "POST",
  path: "/:id/self-declare",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Self-declare a carbon inventory",
    description:
      "Marks a carbon inventory as self-declared and optionally creates an auto-approved submission based on system parameters",
    params: SelfDeclareCarboInventoryParamsSchema,
    response: {
      200: SelfDeclareCarbonInventoryResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
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
  handler: selfDeclareCarbonInventoryHandler,
});
