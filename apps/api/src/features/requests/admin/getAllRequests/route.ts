import { getAllRequestsHandler } from "./handler.js";
import { GetAllAdminRequestsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getAllRequestsRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-requests"],
    summary: "Get all requests",
    description: "Get all submission requests across all organizations",
    response: {
      200: GetAllAdminRequestsResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllRequestsHandler,
});
