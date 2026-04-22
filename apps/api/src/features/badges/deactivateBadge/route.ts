import {
  DeactivateBadgeParamsSchema,
  DeactivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { deactivateBadgeHandler } from "./handler.js";

export const deactivateBadgeRoute: StandardRouteSignature = (fastify) => {
  fastify.post(
    "/:id/deactivate",
    {
      schema: {
        tags: ["badges"],
        summary: "Deactivate a badge",
        description:
          "Sets a badge to INACTIVE. The type may be left with zero active badges. Idempotent if the badge is already INACTIVE.",
        params: DeactivateBadgeParamsSchema,
        response: {
          200: DeactivateBadgeResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    deactivateBadgeHandler
  );
};
