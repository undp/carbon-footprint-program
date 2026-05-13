import { getAllCarbonInventoriesHandler } from "./handler.js";
import {
  GetAllCarbonInventoriesQuery,
  GetAllCarbonInventoriesQuerySchema,
  GetAllCarbonInventoriesResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";

export const getAllCarbonInventoriesRoute = defineRoute<{
  Querystring: GetAllCarbonInventoriesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get all carbon inventories",
    description:
      "Get all carbon inventories ordered by creation date (newest first). Optional parameter: year (e.g., ?year=2024)",
    querystring: GetAllCarbonInventoriesQuerySchema,
    response: {
      200: GetAllCarbonInventoriesResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllCarbonInventoriesHandler,
});
