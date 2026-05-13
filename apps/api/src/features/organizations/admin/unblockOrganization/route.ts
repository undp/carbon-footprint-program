import { unblockOrganizationHandler } from "./handler.js";
import {
  UnblockOrganizationParams,
  UnblockOrganizationParamsSchema,
  UnblockOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const unblockOrganizationRoute = defineRoute<{
  Params: UnblockOrganizationParams;
}>({
  method: "POST",
  path: "/:id/unblock",
  schema: {
    tags: ["admin-organizations"],
    summary: "Unblock an organization",
    description: "Unblock an organization by setting its status to ACTIVE",
    params: UnblockOrganizationParamsSchema,
    response: {
      200: UnblockOrganizationResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: unblockOrganizationHandler,
});
