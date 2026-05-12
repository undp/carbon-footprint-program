import {
  DeactivateBadgeParamsSchema,
  DeactivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { deactivateBadgeHandler } from "./handler.js";

export const deactivateBadgeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/deactivate",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deactivateBadgeHandler
  );
};
