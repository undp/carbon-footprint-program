import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAdminOrganizationsHandler } from "./handler.js";
import {
  GetAdminOrganizationsQuerySchema,
  GetAdminOrganizationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAdminOrganizationsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin", "organizations"],
        summary: "Get all organizations (admin)",
        description:
          "Retrieves a paginated list of organizations with computed fields for the admin panel.",
        querystring: GetAdminOrganizationsQuerySchema,
        response: {
          200: GetAdminOrganizationsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getAdminOrganizationsHandler
  );
};
