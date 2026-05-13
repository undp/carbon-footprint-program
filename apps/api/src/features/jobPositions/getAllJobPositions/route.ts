import { defineRoute } from "@/routing/defineRoute.js";
import { getAllJobPositionsHandler } from "./handler.js";
import { GetAllJobPositionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllJobPositionsRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["job-positions"],
    summary: "Get all job positions",
    description: "Get all job positions",
    response: {
      200: GetAllJobPositionsResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllJobPositionsHandler,
});
