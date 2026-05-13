import { getCarbonInventoryByIdHandler } from "./handler.js";
import {
  GetCarbonInventoryByIdParams,
  GetCarbonInventoryByIdParamsSchema,
  GetCarbonInventoryByIdResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryByIdRoute = defineRoute<{
  Params: GetCarbonInventoryByIdParams;
}>({
  method: "GET",
  path: "/:id",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get a carbon inventory by ID",
    description: "Get a single carbon inventory by its ID",
    params: GetCarbonInventoryByIdParamsSchema,
    response: {
      200: GetCarbonInventoryByIdResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryByIdHandler,
});
