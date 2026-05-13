import { defineRoute } from "@/routing/defineRoute.js";
import { getAllMethodologiesHandler } from "./handler.js";
import { GetAllMethodologiesResponseSchema } from "@repo/types";

export const getAllMethodologiesRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["methodologies"],
    summary: "Get all methodologies",
    description:
      "Get all active methodologies with country info and counts of related categories and carbon inventories, ordered by creation date (newest first)",
    response: {
      200: GetAllMethodologiesResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllMethodologiesHandler,
});
