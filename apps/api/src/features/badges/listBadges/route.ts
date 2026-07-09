import { ListBadgesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { listBadgesHandler } from "./handler.js";

export const listBadgesRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["badges"],
    summary: "List all badges grouped by type",
    description:
      "Returns the active badge and capped history (20 most recent inactive) for every BadgeType. Requires SUPERADMIN.",
    response: {
      200: ListBadgesResponseSchema,
      403: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: listBadgesHandler,
});
