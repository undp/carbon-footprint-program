import type { FastifyRequest } from "fastify";
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

// Extractor function for organization ID
const extractOrganizationId = async (request: FastifyRequest) =>
  Promise.resolve((request.params as UpdateOrganizationParams).id);

export const updateOrganizationRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.patch<{
    Params: UpdateOrganizationParams;
    Body: UpdateOrganizationBody;
  }>(
    "/:id",
    {
      schema: {
        tags: ["app-organizations"],
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
      preHandler: [
        fastify.requireOrganizationRole(extractOrganizationId, [
          OrganizationRole.ORGANIZATION_ADMIN,
        ]),
      ],
    },
    updateOrganizationHandler
  );
};
