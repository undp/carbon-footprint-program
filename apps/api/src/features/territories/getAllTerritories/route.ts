import {
  type GetAllTerritoriesQuery,
  GetAllTerritoriesQuerySchema,
  GetAllTerritoriesResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllTerritoriesHandler } from "./handler.js";

export const getAllTerritoriesRoute = defineRoute<{
  Querystring: GetAllTerritoriesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["territories"],
    summary: "Get the children of a territory",
    description:
      "Retrieves the children of the given territory, or the roots of the " +
      "hierarchy when `parentId` is omitted. Feeds the dependent territorial " +
      "selectors of the organization form. An empty list is a valid answer.",
    querystring: GetAllTerritoriesQuerySchema,
    response: {
      200: GetAllTerritoriesResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllTerritoriesHandler,
});
