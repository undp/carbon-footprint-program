import { OrganizationRole } from "@repo/database/enums";
import { updateOrganizationUserRoleHandler } from "./handler.js";
import {
  UpdateOrganizationUserRoleBody,
  UpdateOrganizationUserRoleBodySchema,
  UpdateOrganizationUserRoleParams,
  UpdateOrganizationUserRoleParamsSchema,
  UpdateOrganizationUserRoleResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const updateOrganizationUserRoleRoute = defineRoute<{
  Params: UpdateOrganizationUserRoleParams;
  Body: UpdateOrganizationUserRoleBody;
}>({
  method: "PATCH",
  path: "/:organizationId/users/:organizationUserId",
  schema: {
    tags: ["organizations"],
    summary: "Update user role in organization",
    description:
      "Update the role of a user within an organization. Users cannot update their own role.",
    params: UpdateOrganizationUserRoleParamsSchema,
    body: UpdateOrganizationUserRoleBodySchema,
    response: {
      200: UpdateOrganizationUserRoleResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      options: {
        extractor: organizationIdRequestExtractor,
        requiredOrganizationRoles: [OrganizationRole.ADMIN],
      },
    },
  },
  handler: updateOrganizationUserRoleHandler,
});
