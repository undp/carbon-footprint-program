import type { FastifyRequest } from "fastify";
import { requestOrganizationAccreditationHandler } from "./handler.js";
import {
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
  RequestOrganizationAccreditationParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database/enums";

// Extractor function for organization ID
const extractOrganizationId = async (request: FastifyRequest) =>
  Promise.resolve(
    (request.params as RequestOrganizationAccreditationParams).id
  );

export const requestOrganizationAccreditationRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.post<{
    Params: RequestOrganizationAccreditationParams;
  }>(
    "/:id/request-accreditation",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Request organization accreditation",
        description:
          "Submit organization for accreditation (requires active membership)",
        params: RequestOrganizationAccreditationParamsSchema,
        response: {
          200: RequestOrganizationAccreditationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(extractOrganizationId, [
          OrganizationRole.ORGANIZATION_ADMIN,
        ]),
      ],
    },
    requestOrganizationAccreditationHandler
  );
};
