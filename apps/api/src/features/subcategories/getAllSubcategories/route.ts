import { defineRoute } from "@/routing/defineRoute.js";
import { getAllSubcategoriesHandler } from "./handler.js";
import {
  GetAllSubcategoriesQuery,
  GetAllSubcategoriesQuerySchema,
  GetAllSubcategoriesResponseSchema,
} from "@repo/types";

export const getAllSubcategoriesRoute = defineRoute<{
  Querystring: GetAllSubcategoriesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["subcategories"],
    summary: "Get all subcategories for a methodology version",
    description:
      "Get all active subcategories for a given methodology version, ordered by name ascending",
    querystring: GetAllSubcategoriesQuerySchema,
    response: {
      200: GetAllSubcategoriesResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllSubcategoriesHandler,
});
