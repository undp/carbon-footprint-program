import {
  ActivateBadgeParams,
  ActivateBadgeParamsSchema,
  ActivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { activateBadgeHandler } from "./handler.js";

export const activateBadgeRoute = defineRoute<{
  Params: ActivateBadgeParams;
}>({
  method: "POST",
  path: "/:id/activate",
  schema: {
    tags: ["badges"],
    summary: "Activate a badge",
    description:
      "Promotes the specified badge to ACTIVE. If another badge of the same type is currently ACTIVE, it is demoted to INACTIVE atomically. Idempotent if the badge is already ACTIVE.",
    params: ActivateBadgeParamsSchema,
    response: {
      200: ActivateBadgeResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: activateBadgeHandler,
});
