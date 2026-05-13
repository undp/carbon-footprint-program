import { OrganizationRole } from "@repo/database/enums";
import { getOrganizationUsersHandler } from "./handler.js";
import {
  GetOrganizationUsersParams,
  GetOrganizationUsersParamsSchema,
  GetOrganizationUsersResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const getOrganizationUsersRoute = defineRoute<{
  Params: GetOrganizationUsersParams;
}>({
  method: "GET",
  path: "/:organizationId/users",
  schema: {
    tags: ["organizations"],
    summary: "Get organization users",
    description:
      "Get all active users in an organization with their roles. Results are sorted by role priority and name.",
    params: GetOrganizationUsersParamsSchema,
    response: {
      200: GetOrganizationUsersResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      organization: {
        extractor: organizationIdRequestExtractor,
        allowedRoles: [
          OrganizationRole.ADMIN,
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.VIEWER,
        ],
      },
    },
  },
  handler: getOrganizationUsersHandler,
});
