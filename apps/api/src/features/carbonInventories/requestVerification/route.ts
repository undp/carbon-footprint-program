import { requestVerificationHandler } from "./handler.js";
import {
  RequestVerificationParamsSchema,
  RequestVerificationBodySchema,
  RequestVerificationResponseSchema,
  type RequestVerificationParams,
  type RequestVerificationBody,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const requestVerificationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: RequestVerificationParams;
    Body: RequestVerificationBody;
  }>(
    "/:id/request-verification",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Request verification submission for a carbon inventory",
        description:
          "Creates a new submission of type VERIFICATION for the specified carbon inventory",
        params: RequestVerificationParamsSchema,
        body: RequestVerificationBodySchema,
        response: {
          200: RequestVerificationResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          requiredOrganizationRoles: [
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.ADMIN,
          ],
        }),
      ],
    },
    requestVerificationHandler
  );
};
