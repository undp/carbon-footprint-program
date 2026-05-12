import { requestOrganizationAccreditationHandler } from "./handler.js";
import {
  RequestOrganizationAccreditationBodySchema,
  RequestOrganizationAccreditationParamsSchema,
  RequestOrganizationAccreditationResponseSchema,
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationBody,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { OrganizationRole } from "@repo/database/enums";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const requestOrganizationAccreditationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: RequestOrganizationAccreditationParams;
    Body: RequestOrganizationAccreditationBody;
  }>(
    "/:id/request-accreditation",
    {
      schema: {
        tags: ["organizations"],
        summary: "Request organization accreditation",
        description:
          "Submit organization for accreditation (requires active membership)",
        params: RequestOrganizationAccreditationParamsSchema,
        body: RequestOrganizationAccreditationBodySchema,
        response: {
          200: RequestOrganizationAccreditationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireOrganizationRole(idRequestExtractor, {
          allowedRoles: [OrganizationRole.ADMIN],
        }),
      ],
    },
    requestOrganizationAccreditationHandler
  );
};
