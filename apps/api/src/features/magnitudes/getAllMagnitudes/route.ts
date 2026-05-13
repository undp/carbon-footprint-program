import { defineRoute } from "@/routing/defineRoute.js";
import { getAllMagnitudesHandler } from "./handler.js";
import { GetAllMagnitudesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllMagnitudesRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["magnitudes"],
    summary: "List all active magnitudes",
    description:
      "Returns active magnitudes pinned by isSystem and ordered by name, each with its reference count.",
    response: {
      200: GetAllMagnitudesResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllMagnitudesHandler,
});
