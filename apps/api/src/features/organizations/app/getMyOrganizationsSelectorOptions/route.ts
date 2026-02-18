import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMyOrganizationsHandler } from "./handler.js";
import { MyOrganizationsSelectorOptionsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMyOrganizationsRoute = (fastify: FastifyZodInstance) => {
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
    },
    getMyOrganizationsHandler
  );
};
