import {
  GetCarbonInventoriesMinimalParamsSchema,
  GetCarbonInventoriesMinimalResponseSchema,
} from "@repo/types";
import { getCarbonInventoriesMinimalHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoriesMinimalRoute = defineRoute({
  method: "GET",
  path: "/minimal",
  schema: {
    tags: ["carbon-inventories-minimal"],
    summary: "Get carbon inventories minimal",
    params: GetCarbonInventoriesMinimalParamsSchema,
    description:
      "Get carbon inventories by status, returning only id, name, year and status. Ordered by status priority and year descending.",
    response: {
      200: GetCarbonInventoriesMinimalResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getCarbonInventoriesMinimalHandler,
});
