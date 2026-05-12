import {
  ActivateBadgeParamsSchema,
  ActivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { activateBadgeHandler } from "./handler.js";

export const activateBadgeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/activate",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    activateBadgeHandler
  );
};
