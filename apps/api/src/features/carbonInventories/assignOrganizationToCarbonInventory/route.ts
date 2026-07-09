import { assignOrganizationToCarbonInventoryHandler } from "./handler.js";
import {
  AssignOrganizationToCarbonInventoryParamsSchema,
  AssignOrganizationToCarbonInventoryResponseSchema,
  type AssignOrganizationToCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import type { IdExtractor } from "@/routing/access.js";
import { OrganizationRole } from "@repo/database/enums";

const organizationIdExtractor: IdExtractor = (request) =>
  (request.params as { organizationId?: string } | undefined)?.organizationId;

export const assignOrganizationToCarbonInventoryRoute = defineRoute<{
  Params: AssignOrganizationToCarbonInventoryParams;
}>({
  method: "POST",
  path: "/:id/assign-organization/:organizationId",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Associate an organization to a draft carbon inventory",
    description:
      "Assigns an organization to a carbon inventory that does not yet have one. The user must be an active CONTRIBUTOR or ADMIN of the target organization.",
    params: AssignOrganizationToCarbonInventoryParamsSchema,
    response: {
      200: AssignOrganizationToCarbonInventoryResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: [
      { kind: "carbonInventory" },
      {
        kind: "organization",
        options: {
          extractor: organizationIdExtractor,
          requiredOrganizationRoles: [
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.ADMIN,
          ],
        },
      },
    ],
  },
  handler: assignOrganizationToCarbonInventoryHandler,
});
