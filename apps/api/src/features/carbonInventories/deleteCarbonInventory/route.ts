import { deleteCarbonInventoryHandler } from "./handler.js";
import {
  DeleteCarbonInventoryParamsSchema,
  DeleteCarbonInventoryResponseSchema,
  type DeleteCarbonInventoryParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const deleteCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete<{
    Params: DeleteCarbonInventoryParams;
  }>(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Delete a carbon inventory",
        description:
          "Soft-delete a carbon inventory by ID (sets status to DELETED)",
        params: DeleteCarbonInventoryParamsSchema,
        response: {
          200: DeleteCarbonInventoryResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
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
    deleteCarbonInventoryHandler
  );
};
