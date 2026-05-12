import { z } from "zod";
import {
  UpdateExplanationParamsSchema,
  UpdateExplanationRequestSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { updateExplanationHandler } from "./handler.js";

export const updateExplanationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:slug",
    {
      schema: {
        tags: ["admin-explanations"],
        summary: "Update an explanation's content",
        description: "Updates the markdown content of an explanation by slug.",
        params: UpdateExplanationParamsSchema,
        body: UpdateExplanationRequestSchema,
        response: {
          204: z.null().describe("Explanation updated successfully"),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateExplanationHandler
  );
};
