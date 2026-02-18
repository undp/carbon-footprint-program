import { getMyOrganizationsHandler } from "./handler.js";
import { MyOrganizationsSelectorOptionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getMyOrganizationsRoute: StandardRouteSignature = (
  fastify,
  options
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
          200: MyOrganizationsSelectorOptionsResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getMyOrganizationsHandler
  );
};
