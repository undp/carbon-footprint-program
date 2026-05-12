import { getReductionProjectAccessHandler } from "./handler.js";
import {
  GetReductionProjectAccessParamsSchema,
  GetReductionProjectAccessResponseSchema,
  OrganizationRole,
  type GetReductionProjectAccessParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getReductionProjectAccessRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetReductionProjectAccessParams }>(
    "/:id/access",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireReductionProjectAccess({
          requiredOrganizationRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
          canAdminsBypass: true,
        }),
      ],
    },
    getReductionProjectAccessHandler
  );
};
