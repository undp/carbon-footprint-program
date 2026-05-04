import { getOrganizationByIdHandler } from "./handler.js";
import {
  GetOrganizationByIdParamsSchema,
  GetOrganizationByIdResponseSchema,
  GetOrganizationByIdParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getOrganizationByIdRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get<{
    Params: GetOrganizationByIdParams;
  }>(
    "/:id",
    {
      schema: {
        tags: ["organizations"],
        summary: "Get organization by ID",
        description:
          "Get organization details by ID (requires active membership)",
        params: GetOrganizationByIdParamsSchema,
        response: {
          200: GetOrganizationByIdResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(idRequestExtractor, {
          allowedRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
          canAdminsBypass: true,
        }),
      ],
    },
    getOrganizationByIdHandler
  );
};
