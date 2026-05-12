import { getAllOrganizationMainActivitiesHandler } from "./handler.js";
import {
  GetAllOrganizationMainActivitiesResponseSchema,
  GetAllOrganizationMainActivitiesQuerySchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getAllOrganizationMainActivitiesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["organization-main-activities"],
        summary: "Get all organization main activities",
        description:
          "Retrieves organization main activities. Behavior:\n" +
          "- No filter: Returns only generic activities (NULL sector/subsector)\n" +
          "- sectorId only: Returns sector-specific + generic activities\n" +
          "- sectorId + subsectorId: Returns filtered activities + generic activities\n" +
          "- subsectorId only: FORBIDDEN (returns 400 error)\n" +
          "Generic activities are ALWAYS included in results when filtering.",
        querystring: GetAllOrganizationMainActivitiesQuerySchema,
        response: {
          200: GetAllOrganizationMainActivitiesResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllOrganizationMainActivitiesHandler
  );
};
