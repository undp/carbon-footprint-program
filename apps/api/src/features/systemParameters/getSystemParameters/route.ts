import { getSystemParametersHandler } from "./handler.js";
import {
  GetSystemParametersQuery,
  GetSystemParametersQuerySchema,
  GetSystemParametersResponseSchema,
} from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSystemParametersRoute = defineRoute<{
  Querystring: GetSystemParametersQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["system-parameters"],
    summary: "Get system parameters",
    description:
      "Get system parameters, optionally filtered by comma-separated keys",
    querystring: GetSystemParametersQuerySchema,
    response: {
      200: GetSystemParametersResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getSystemParametersHandler,
});
