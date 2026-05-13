import { OrganizationRole } from "@repo/database/enums";
import { removeOrganizationUserHandler } from "./handler.js";
import {
  RemoveOrganizationUserParams,
  RemoveOrganizationUserParamsSchema,
  RemoveOrganizationUserResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const removeOrganizationUserRoute = defineRoute<{
  Params: RemoveOrganizationUserParams;
}>({
  method: "DELETE",
  path: "/:organizationId/users/:organizationUserId",
  schema: {
    tags: ["organizations"],
    summary: "Remove user from organization",
    description:
      "Remove a user from an organization (soft delete). Users cannot remove themselves. Cannot remove the last admin.",
    params: RemoveOrganizationUserParamsSchema,
    response: {
      200: RemoveOrganizationUserResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      organization: {
        extractor: organizationIdRequestExtractor,
        allowedRoles: [OrganizationRole.ADMIN],
      },
    },
  },
  handler: removeOrganizationUserHandler,
});
