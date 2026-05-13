import { blockOrganizationHandler } from "./handler.js";
import {
  BlockOrganizationParams,
  BlockOrganizationParamsSchema,
  BlockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const blockOrganizationRoute = defineRoute<{
  Params: BlockOrganizationParams;
}>({
  method: "POST",
  path: "/:id/block",
  schema: {
    tags: ["admin-organizations"],
    summary: "Block an organization",
    description: "Block an organization by setting its status to BLOCKED",
    params: BlockOrganizationParamsSchema,
    response: {
      200: BlockOrganizationResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: blockOrganizationHandler,
});
