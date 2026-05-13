import { getReductionProjectHistoryHandler } from "./handler.js";
import {
  GetReductionProjectHistoryParams,
  GetReductionProjectHistoryParamsSchema,
  GetReductionProjectHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getReductionProjectHistoryRoute = defineRoute<{
  Params: GetReductionProjectHistoryParams;
}>({
  method: "GET",
  path: "/reduction-project/:id/history",
  schema: {
    tags: ["submissions"],
    summary: "Get reduction project submission history",
    description:
      "Get the history of submissions for a specific reduction project.",
    params: GetReductionProjectHistoryParamsSchema,
    response: {
      200: GetReductionProjectHistoryResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "reductionProject",
      reductionProject: {
        requiredOrganizationRoles: [
          OrganizationRole.ADMIN,
          OrganizationRole.CONTRIBUTOR,
          OrganizationRole.VIEWER,
        ],
        canAdminsBypass: true,
      },
    },
  },
  handler: getReductionProjectHistoryHandler,
});
