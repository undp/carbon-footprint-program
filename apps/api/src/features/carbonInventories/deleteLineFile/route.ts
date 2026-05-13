import {
  DeleteLineFileParamsSchema,
  DeleteLineFileResponseSchema,
  type DeleteLineFileParams,
  type DeleteLineFileResponse,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { deleteLineFileHandler } from "./handler.js";

export const deleteLineFileRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete<{
    Params: DeleteLineFileParams;
    Reply: DeleteLineFileResponse;
  }>(
    "/:id/files/:uuid",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Soft-delete a carbon inventory line file",
        params: DeleteLineFileParamsSchema,
        response: {
          200: DeleteLineFileResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
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
    deleteLineFileHandler
  );
};
