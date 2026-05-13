import {
  DeactivateBadgeParams,
  DeactivateBadgeParamsSchema,
  DeactivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { deactivateBadgeHandler } from "./handler.js";

export const deactivateBadgeRoute = defineRoute<{
  Params: DeactivateBadgeParams;
}>({
  method: "POST",
  path: "/:id/deactivate",
  schema: {
    tags: ["badges"],
    summary: "Deactivate a badge",
    description:
      "Sets the specified badge to INACTIVE without activating a replacement. The type may legitimately end with zero ACTIVE badges. Idempotent if already INACTIVE.",
    params: DeactivateBadgeParamsSchema,
    response: {
      200: DeactivateBadgeResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deactivateBadgeHandler,
});
