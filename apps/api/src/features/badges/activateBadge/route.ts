import {
  ActivateBadgeParamsSchema,
  ActivateBadgeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { activateBadgeHandler } from "./handler.js";

export const activateBadgeRoute: StandardRouteSignature = (fastify) => {
  fastify.post(
    "/:id/activate",
    {
      schema: {
        tags: ["badges"],
        summary: "Activate a badge",
        description:
          "Promotes a badge to ACTIVE, demoting the current ACTIVE badge of the same type (if any). Idempotent if the badge is already ACTIVE.",
        params: ActivateBadgeParamsSchema,
        response: {
          200: ActivateBadgeResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    activateBadgeHandler
  );
};
