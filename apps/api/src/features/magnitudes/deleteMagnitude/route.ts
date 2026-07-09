import { z } from "zod";
import { defineRoute } from "@/routing/defineRoute.js";
import { deleteMagnitudeHandler } from "./handler.js";
import {
  DeleteMagnitudeParams,
  DeleteMagnitudeParamsSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMagnitudeRoute = defineRoute<{
  Params: DeleteMagnitudeParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["magnitudes"],
    summary: "Soft-delete a magnitude",
    description:
      "Soft-deletes a custom magnitude with no measurement-unit references. System magnitudes and referenced magnitudes are rejected.",
    params: DeleteMagnitudeParamsSchema,
    response: {
      200: z.null().describe("Successfully soft-deleted"),
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteMagnitudeHandler,
});
