import { defineRoute } from "@/routing/defineRoute.js";
import { getEmissionFactorDimensionsHandler } from "./handler.js";
import {
  GetEmissionFactorDimensionsQuery,
  GetEmissionFactorDimensionsQuerySchema,
  GetEmissionFactorDimensionsResponseSchema,
} from "@repo/types";

export const getEmissionFactorDimensionsRoute = defineRoute<{
  Querystring: GetEmissionFactorDimensionsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["emission-factor-dimensions"],
    summary: "Get emission factor dimensions for a methodology version",
    description:
      "Get all dimension configurations per subcategory for a methodology version",
    querystring: GetEmissionFactorDimensionsQuerySchema,
    response: {
      200: GetEmissionFactorDimensionsResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getEmissionFactorDimensionsHandler,
});
