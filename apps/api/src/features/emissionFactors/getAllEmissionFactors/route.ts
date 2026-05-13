import { defineRoute } from "@/routing/defineRoute.js";
import { getAllEmissionFactorsHandler } from "./handler.js";
import {
  GetAllEmissionFactorsQuery,
  GetAllEmissionFactorsQuerySchema,
  GetAllEmissionFactorsResponseSchema,
} from "@repo/types";

export const getAllEmissionFactorsRoute = defineRoute<{
  Querystring: GetAllEmissionFactorsQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["emission-factors"],
    summary: "Get all emission factors for a methodology version",
    description:
      "Get all active emission factors for a given methodology version, ordered by subcategory",
    querystring: GetAllEmissionFactorsQuerySchema,
    response: {
      200: GetAllEmissionFactorsResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllEmissionFactorsHandler,
});
