import { z } from "zod";
import {
  UpdateExplanationParams,
  UpdateExplanationParamsSchema,
  UpdateExplanationRequest,
  UpdateExplanationRequestSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { updateExplanationHandler } from "./handler.js";

export const updateExplanationRoute = defineRoute<{
  Params: UpdateExplanationParams;
  Body: UpdateExplanationRequest;
}>({
  method: "PATCH",
  path: "/:slug",
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
  access: { mode: "private" },
  handler: updateExplanationHandler,
});
