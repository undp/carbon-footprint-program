import { getReductionProjectAccessHandler } from "./handler.js";
import {
  GetReductionProjectAccessParams,
  GetReductionProjectAccessParamsSchema,
  GetReductionProjectAccessResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getReductionProjectAccessRoute = defineRoute<{
  Params: GetReductionProjectAccessParams;
}>({
  method: "GET",
  path: "/:id/access",
  schema: {
    tags: ["reduction-projects"],
    summary: "Get reduction project access",
    description:
      "Resolves whether the requesting user can edit a reduction project. Read access is enforced by the preHandler — a 403 here means no read access.",
    params: GetReductionProjectAccessParamsSchema,
    response: {
      200: GetReductionProjectAccessResponseSchema,
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
  handler: getReductionProjectAccessHandler,
});
