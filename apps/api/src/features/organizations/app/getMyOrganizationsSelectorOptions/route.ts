import { getMyOrganizationsHandler } from "./handler.js";
import { GetMyOrganizationsSelectorOptionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getMyOrganizationsRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
    "/me",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Get my organizations",
        description:
          "Get all organizations where the user has an active membership",
        response: {
          200: GetMyOrganizationsSelectorOptionsResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    getMyOrganizationsHandler
  );
};
