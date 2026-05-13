import { defineRoute } from "@/routing/defineRoute.js";
import {
  CreateCountrySubsectorRequest,
  CreateCountrySubsectorRequestSchema,
  CreateCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountrySubsectorHandler } from "./handler.js";

export const createCountrySubsectorRoute = defineRoute<{
  Body: CreateCountrySubsectorRequest;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["admin-country-subsectors"],
    summary: "Create a country subsector",
    body: CreateCountrySubsectorRequestSchema,
    response: {
      201: CreateCountrySubsectorResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: createCountrySubsectorHandler,
});
