import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  GetAllAdminCountryOrganizationSizesQuerySchema,
  GetAllAdminCountryOrganizationSizesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountryOrganizationSizesHandler } from "./handler.js";

export const getAllAdminCountryOrganizationSizesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Get all country organization sizes (admin view)",
        querystring: GetAllAdminCountryOrganizationSizesQuerySchema,
        response: {
          200: GetAllAdminCountryOrganizationSizesResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    getAllAdminCountryOrganizationSizesHandler
  );
};
