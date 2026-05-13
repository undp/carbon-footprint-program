import { defineRoute } from "@/routing/defineRoute.js";
import { getAllCountrySectorsHandler } from "./handler.js";
import { GetAllCountrySectorsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountrySectorsRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["country-sectors"],
    summary: "Get all country sectors",
    description: "Retrieves all country sectors with their details",
    response: {
      200: GetAllCountrySectorsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllCountrySectorsHandler,
});
