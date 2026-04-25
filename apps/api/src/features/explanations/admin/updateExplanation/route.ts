import {
  UpdateExplanationParamsSchema,
  UpdateExplanationRequestSchema,
  UpdateExplanationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { updateExplanationHandler } from "./handler.js";

export const updateExplanationRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.patch(
    "/:slug",
    {
      schema: {
        tags: ["admin-explanations"],
        summary: "Update an explanation's content",
        description:
          "Updates the markdown content of an explanation. Only catalog slugs are accepted; the slug, name and description are immutable from this endpoint.",
        params: UpdateExplanationParamsSchema,
        body: UpdateExplanationRequestSchema,
        response: {
          200: UpdateExplanationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    updateExplanationHandler
  );
};
