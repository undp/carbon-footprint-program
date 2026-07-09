import { defineRoute } from "@/routing/defineRoute.js";
import { updateMagnitudeHandler } from "./handler.js";
import {
  UpdateMagnitudeBody,
  UpdateMagnitudeBodySchema,
  UpdateMagnitudeParams,
  UpdateMagnitudeParamsSchema,
  UpdateMagnitudeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMagnitudeRoute = defineRoute<{
  Params: UpdateMagnitudeParams;
  Body: UpdateMagnitudeBody;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["magnitudes"],
    summary: "Update a magnitude",
    description:
      "Renames a magnitude. Only the name field is editable; code and isSystem are immutable.",
    params: UpdateMagnitudeParamsSchema,
    body: UpdateMagnitudeBodySchema,
    response: {
      200: UpdateMagnitudeResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateMagnitudeHandler,
});
