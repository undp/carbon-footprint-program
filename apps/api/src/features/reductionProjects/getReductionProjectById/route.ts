import { getReductionProjectByIdHandler } from "./handler.js";
import {
  GetReductionProjectByIdParamsSchema,
  GetReductionProjectByIdResponseSchema,
  OrganizationRole,
  type GetReductionProjectByIdParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
export const getReductionProjectByIdRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetReductionProjectByIdParams }>(
    "/:id",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Get reduction project by ID",
        params: GetReductionProjectByIdParamsSchema,
        response: {
          200: GetReductionProjectByIdResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
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
    getReductionProjectByIdHandler
  );
};
