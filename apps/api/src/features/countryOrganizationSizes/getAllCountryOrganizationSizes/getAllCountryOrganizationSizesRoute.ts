import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountryOrganizationSizesHandler } from "./getAllCountryOrganizationSizesHandler.js";
import { GetAllCountryOrganizationSizesResponseSchema } from "./getAllCountryOrganizationSizesSchema.js";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountryOrganizationSizesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-organization-sizes"],
        summary: "Get all country organization sizes",
        description:
          "Retrieves all country organization sizes with their details",
        response: {
          200: GetAllCountryOrganizationSizesResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllCountryOrganizationSizesHandler
  );
};
