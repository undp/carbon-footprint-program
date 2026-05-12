import { updateOrganizationHandler } from "./handler.js";
import {
  UpdateOrganizationParamsSchema,
  UpdateOrganizationBodySchema,
  UpdateOrganizationResponseSchema,
  UpdateOrganizationParams,
  UpdateOrganizationBody,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database/enums";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const updateOrganizationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateOrganizationParams;
    Body: UpdateOrganizationBody;
  }>(
    "/:id",
    {
      schema: {
        tags: ["organizations"],
        summary: "Update organization",
        description:
          "Update organization data (requires active membership). Behavior varies by state: DRAFT updates in-place, APPROVED creates new submission, PENDING throws error, REJECTED creates new draft.",
        params: UpdateOrganizationParamsSchema,
        body: UpdateOrganizationBodySchema,
        response: {
          200: UpdateOrganizationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireOrganizationRole(idRequestExtractor, {
          allowedRoles: [OrganizationRole.ADMIN],
        }),
      ],
    },
    updateOrganizationHandler
  );
};
