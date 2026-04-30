import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  DeleteCountryOrganizationSizeParamsSchema,
  DeleteCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountryOrganizationSizeHandler } from "./handler.js";

export const deleteCountryOrganizationSizeRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Soft-delete a country organization size",
        params: DeleteCountryOrganizationSizeParamsSchema,
        response: {
          200: DeleteCountryOrganizationSizeResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteCountryOrganizationSizeHandler
  );
};
