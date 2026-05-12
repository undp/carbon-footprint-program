import { updateCarbonInventoryHandler } from "./handler.js";
import {
  UpdateCarbonInventoryParamsSchema,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
  type UpdateCarbonInventoryRequest,
  type UpdateCarbonInventoryParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const updateCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateCarbonInventoryParams;
    Body: UpdateCarbonInventoryRequest;
  }>(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update a carbon inventory",
        description:
          "Update any attributes of an existing carbon inventory by ID",
        params: UpdateCarbonInventoryParamsSchema,
        body: UpdateCarbonInventoryRequestSchema,
        response: {
          200: UpdateCarbonInventoryResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
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
    updateCarbonInventoryHandler
  );
};
