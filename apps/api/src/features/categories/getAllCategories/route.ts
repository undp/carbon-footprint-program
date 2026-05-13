import { defineRoute } from "@/routing/defineRoute.js";
import { getAllCategoriesHandler } from "./handler.js";
import {
  GetAllCategoriesQuery,
  GetAllCategoriesQuerySchema,
  GetAllCategoriesResponseSchema,
} from "@repo/types";

export const getAllCategoriesRoute = defineRoute<{
  Querystring: GetAllCategoriesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["categories"],
    summary: "Get all categories for a methodology version",
    description:
      "Get all active categories for a given methodology version, ordered by position ascending",
    querystring: GetAllCategoriesQuerySchema,
    response: {
      200: GetAllCategoriesResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllCategoriesHandler,
});
