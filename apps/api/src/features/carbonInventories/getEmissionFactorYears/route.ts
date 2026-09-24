import { getEmissionFactorYearsHandler } from "./handler.js";
import {
  GetEmissionFactorYearsParams,
  GetEmissionFactorYearsParamsSchema,
  GetEmissionFactorYearsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getEmissionFactorYearsRoute = defineRoute<{
  Params: GetEmissionFactorYearsParams;
}>({
  method: "GET",
  path: "/:id/emission-factor-years",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get the years the inventory's methodology has factors for",
    description:
      "Retrieves the footprint years covered by the emission factor catalogue of the methodology this inventory is pinned to, so the year selector only offers years that leave something to capture with.",
    params: GetEmissionFactorYearsParamsSchema,
    response: {
      200: GetEmissionFactorYearsResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  // Same reach as the methodology this answers about: step 1 of the calculator
  // runs before anyone signs in, so the anonymous inventory credential has to
  // work here too.
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getEmissionFactorYearsHandler,
});
