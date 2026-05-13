import { getOrganizationHistoryHandler } from "./handler.js";
import {
  GetOrganizationHistoryParams,
  GetOrganizationHistoryParamsSchema,
  GetOrganizationHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getOrganizationHistoryRoute = defineRoute<{
  Params: GetOrganizationHistoryParams;
}>({
  method: "GET",
  path: "/organization/:id/history",
  schema: {
    tags: ["submissions"],
    summary: "Get organization submission history",
    description: "Get the history of submissions for a specific organization.",
    params: GetOrganizationHistoryParamsSchema,
    response: {
      200: GetOrganizationHistoryResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "organization",
      organization: {
        allowedRoles: [
          OrganizationRole.ADMIN,
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.VIEWER,
        ],
        canAdminsBypass: true,
      },
    },
  },
  handler: getOrganizationHistoryHandler,
});
