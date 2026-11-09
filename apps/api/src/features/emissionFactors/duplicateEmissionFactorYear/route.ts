import { defineRoute } from "@/routing/defineRoute.js";
import {
  DuplicateEmissionFactorYearRequestSchema,
  DuplicateEmissionFactorYearResponseSchema,
  type DuplicateEmissionFactorYearRequest,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { duplicateEmissionFactorYearHandler } from "./handler.js";

export const duplicateEmissionFactorYearRoute = defineRoute<{
  Body: DuplicateEmissionFactorYearRequest;
}>({
  method: "POST",
  path: "/duplicate-year",
  schema: {
    tags: ["emission-factors"],
    summary: "Copy the emission factors of one year into another",
    description:
      "Creates the target-year factors of a methodology version from its source-year factors, with per-factor changes. Never overwrites an existing factor; refuses the whole copy with 422 when the result would break a factor rule.",
    body: DuplicateEmissionFactorYearRequestSchema,
    response: {
      200: DuplicateEmissionFactorYearResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: duplicateEmissionFactorYearHandler,
});
