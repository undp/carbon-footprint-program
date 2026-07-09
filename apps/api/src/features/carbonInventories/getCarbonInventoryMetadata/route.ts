import { getCarbonInventoryMetadataHandler } from "./handler.js";
import {
  GetCarbonInventoryMetadataParams,
  GetCarbonInventoryMetadataParamsSchema,
  GetCarbonInventoryMetadataResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryMetadataRoute = defineRoute<{
  Params: GetCarbonInventoryMetadataParams;
}>({
  method: "GET",
  path: "/:id/metadata",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get carbon inventory metadata",
    description:
      "Retrieves the metadata attributes of a carbon inventory, including resolved organization, sector, size, and main activity names.",
    params: GetCarbonInventoryMetadataParamsSchema,
    response: {
      200: GetCarbonInventoryMetadataResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryMetadataHandler,
});
