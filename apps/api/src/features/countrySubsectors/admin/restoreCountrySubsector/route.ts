import { defineRoute } from "@/routing/defineRoute.js";
import {
  RestoreCountrySubsectorParams,
  RestoreCountrySubsectorParamsSchema,
  RestoreCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreCountrySubsectorHandler } from "./handler.js";

export const restoreCountrySubsectorRoute = defineRoute<{
  Params: RestoreCountrySubsectorParams;
}>({
  method: "POST",
  path: "/:id/restore",
  schema: {
    tags: ["admin-country-subsectors"],
    summary: "Restore a soft-deleted country subsector",
    params: RestoreCountrySubsectorParamsSchema,
    response: {
      200: RestoreCountrySubsectorResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: restoreCountrySubsectorHandler,
});
