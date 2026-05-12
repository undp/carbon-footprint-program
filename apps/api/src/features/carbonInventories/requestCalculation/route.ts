import { requestCalculationHandler } from "./handler.js";
import {
  RequestCalculationParamsSchema,
  RequestCalculationResponseSchema,
  type RequestCalculationParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const requestCalculationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{ Params: RequestCalculationParams }>(
    "/:id/request-calculation",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Request calculation submission for a carbon inventory",
        description:
          "Creates a new submission of type CALCULATION for the specified carbon inventory",
        params: RequestCalculationParamsSchema,
        response: {
          200: RequestCalculationResponseSchema,
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
    requestCalculationHandler
  );
};
