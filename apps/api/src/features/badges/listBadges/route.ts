import { ListBadgesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { listBadgesHandler } from "./handler.js";

export const listBadgesRoute: StandardRouteSignature = (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["badges"],
        summary: "List all badges grouped by type",
        description:
          "Returns the full badge catalog: for each BadgeType, the active badge (if any) and the 20 most recent inactive badges, each with a signed preview URL.",
        response: {
          200: ListBadgesResponseSchema,
          403: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    listBadgesHandler
  );
};
