import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMyOrganizationsHandler } from "./handler.js";
import { GetMyOrganizationsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMyOrganizationsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/mine",
    {
      schema: {
        tags: ["app-organizations"],
        summary: "Get my organizations",
        description:
          "Retrieves all organizations where the authenticated user has active membership.",
        response: {
          200: GetMyOrganizationsResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getMyOrganizationsHandler
  );
};
