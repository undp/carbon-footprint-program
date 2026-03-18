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
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const requestVerificationRoute: StandardRouteSignature = (fastify) => {
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
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams,
          {
            requiredOrganizationRoles: [
              OrganizationRole.CONTRIBUTOR,
              OrganizationRole.ADMIN,
            ],
          }
        ),
      ],
    },
    requestVerificationHandler
  );
};
