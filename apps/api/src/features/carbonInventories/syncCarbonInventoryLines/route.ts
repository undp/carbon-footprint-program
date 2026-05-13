import { syncCarbonInventoryLinesHandler } from "./handler.js";
import {
  SyncCarbonInventoryLinesParams,
  SyncCarbonInventoryLinesParamsSchema,
  SyncCarbonInventoryLinesRequest,
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const syncCarbonInventoryLinesRoute = defineRoute<{
  Params: SyncCarbonInventoryLinesParams;
  Body: SyncCarbonInventoryLinesRequest;
}>({
  method: "POST",
  path: "/:id/lines/sync",
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
  access: {
    mode: "anonymous",
    options: {
      requiredOrganizationRoles: [
        OrganizationRole.CONTRIBUTOR,
        OrganizationRole.ADMIN,
      ],
    },
  },
  handler: syncCarbonInventoryLinesHandler,
});
