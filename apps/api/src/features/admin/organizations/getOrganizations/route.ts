import type { FastifyZodInstance } from "@/types/fastify.js";
import { GetAllOrganizationsHandler } from "./handler.js";
import {
  GetAllOrganizationsQuerySchema,
  GetAllOrganizationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const GetAllOrganizationsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin", "organizations"],
        summary: "Get all organizations (admin)",
        description:
          "Retrieves a paginated list of organizations with computed fields for the admin panel.",
        querystring: GetAllOrganizationsQuerySchema,
        response: {
          200: GetAllOrganizationsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    GetAllOrganizationsHandler
  );
};
