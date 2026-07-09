import { defineRoute } from "@/routing/defineRoute.js";
import {
  UpdateCountrySubsectorParams,
  UpdateCountrySubsectorParamsSchema,
  UpdateCountrySubsectorRequest,
  UpdateCountrySubsectorRequestSchema,
  UpdateCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateCountrySubsectorHandler } from "./handler.js";

export const updateCountrySubsectorRoute = defineRoute<{
  Params: UpdateCountrySubsectorParams;
  Body: UpdateCountrySubsectorRequest;
}>({
  method: "PATCH",
  path: "/:id",
  schema: {
    tags: ["admin-country-subsectors"],
    summary: "Update a country subsector",
    params: UpdateCountrySubsectorParamsSchema,
    body: UpdateCountrySubsectorRequestSchema,
    response: {
      200: UpdateCountrySubsectorResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateCountrySubsectorHandler,
});
