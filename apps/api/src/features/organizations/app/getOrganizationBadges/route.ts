import {
  GetOrganizationBadgesParamsSchema,
  GetOrganizationBadgesQuerySchema,
  GetOrganizationBadgesResponseSchema,
  type GetOrganizationBadgesParams,
  type GetOrganizationBadgesQuery,
} from "@repo/types";
import { getOrganizationBadgesHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getOrganizationBadgesRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get<{
    Params: GetOrganizationBadgesParams;
    Querystring: GetOrganizationBadgesQuery;
  }>(
    "/:id/badges",
    {
      schema: {
        tags: ["organizations"],
        summary: "Get organization badges",
        description:
          "Get all badges earned by an organization through approved carbon inventory submissions.",
        params: GetOrganizationBadgesParamsSchema,
        querystring: GetOrganizationBadgesQuerySchema,
        response: {
          200: GetOrganizationBadgesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getOrganizationBadgesHandler
  );
};
