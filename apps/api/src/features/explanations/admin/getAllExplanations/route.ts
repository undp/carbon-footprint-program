import { GetAllExplanationsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { getAllExplanationsHandler } from "./handler.js";

export const getAllExplanationsRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-explanations"],
    summary: "List explanations",
    description:
      "Returns the explanation catalog rows for admin maintenance, sorted by name ascending.",
    response: {
      200: GetAllExplanationsResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllExplanationsHandler,
});
