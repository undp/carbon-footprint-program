import { GetTerritoryLevelsResponseSchema } from "@repo/types";
import { defineRoute } from "@/routing/defineRoute.js";
import { getTerritoryLevelsHandler } from "./handler.js";

export const getTerritoryLevelsRoute = defineRoute({
  method: "GET",
  path: "/levels",
  schema: {
    tags: ["territories"],
    summary: "Get the levels the territorial catalog holds",
    description:
      "Retrieves the levels of the hierarchy that actually have rows, " +
      "outermost first. The organization form renders one selector per level " +
      "returned, so a level loaded later appears without a code change and a " +
      "level with no data is never rendered as a dead control.",
    response: {
      200: GetTerritoryLevelsResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getTerritoryLevelsHandler,
});
