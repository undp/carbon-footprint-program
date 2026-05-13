import { getCarbonInventoryMethodologyHandler } from "./handler.js";
import {
  GetCarbonInventoryMethodologyParams,
  GetCarbonInventoryMethodologyParamsSchema,
  GetCarbonInventoryMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryMethodologyRoute = defineRoute<{
  Params: GetCarbonInventoryMethodologyParams;
}>({
  method: "GET",
  path: "/:id/methodology",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get methodology for carbon inventory",
    description:
      "Retrieves the methodology associated with a given carbon inventory, including all its categories, subcategories, dimensions, dimension values, and emission factors.",
    params: GetCarbonInventoryMethodologyParamsSchema,
    response: {
      200: GetCarbonInventoryMethodologyResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryMethodologyHandler,
});
