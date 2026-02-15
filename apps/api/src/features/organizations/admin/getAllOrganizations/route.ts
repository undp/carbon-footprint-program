import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllOrganizationsHandler } from "./handler.js";
import {
  GetAllOrganizationsQuerySchema,
  GetAllOrganizationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllOrganizationsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-organizations"],
        summary: "Get all organizations",
        description:
          "Get all organizations with pagination, sorting, and filtering",
        querystring: GetAllOrganizationsQuerySchema,
        response: {
          200: GetAllOrganizationsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getAllOrganizationsHandler
  );
};
