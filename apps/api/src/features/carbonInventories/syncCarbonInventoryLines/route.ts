import { syncCarbonInventoryLinesHandler } from "./handler.js";
import {
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
  SyncCarbonInventoryLinesParamsSchema,
  type SyncCarbonInventoryLinesRequest,
  type SyncCarbonInventoryLinesParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const syncCarbonInventoryLinesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: SyncCarbonInventoryLinesParams;
    Body: SyncCarbonInventoryLinesRequest;
  }>(
    "/:id/lines/sync",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Sync carbon inventory lines (create, update, delete)",
        description:
          "Synchronize lines in a carbon inventory. This endpoint allows creating new lines, updating existing lines, and deleting lines in a single atomic operation.",
        params: SyncCarbonInventoryLinesParamsSchema,
        body: SyncCarbonInventoryLinesRequestSchema,
        response: {
          200: SyncCarbonInventoryLinesResponseSchema,
          400: ApiErrorResponseSchema,
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
    syncCarbonInventoryLinesHandler
  );
};
