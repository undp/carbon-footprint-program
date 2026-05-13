import { getCarbonInventoryAccessHandler } from "./handler.js";
import {
  GetCarbonInventoryAccessParams,
  GetCarbonInventoryAccessParamsSchema,
  GetCarbonInventoryAccessResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryAccessRoute = defineRoute<{
  Params: GetCarbonInventoryAccessParams;
}>({
  method: "GET",
  path: "/:id/access",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get carbon inventory access",
    description:
      "Resolves whether the requesting user can edit a carbon inventory. Access (read) itself is enforced by the preHandler — a 403 here means the caller has no read access at all.",
    params: GetCarbonInventoryAccessParamsSchema,
    response: {
      200: GetCarbonInventoryAccessResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryAccessHandler,
});
