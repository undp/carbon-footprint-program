import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  CreateCountryOrganizationSizeRequestSchema,
  CreateCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountryOrganizationSizeHandler } from "./handler.js";

export const createCountryOrganizationSizeRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Create a country organization size",
        body: CreateCountryOrganizationSizeRequestSchema,
        response: {
          201: CreateCountryOrganizationSizeResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createCountryOrganizationSizeHandler
  );
};
