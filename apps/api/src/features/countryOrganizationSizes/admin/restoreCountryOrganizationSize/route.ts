import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  RestoreCountryOrganizationSizeParamsSchema,
  RestoreCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreCountryOrganizationSizeHandler } from "./handler.js";

export const restoreCountryOrganizationSizeRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/:id/restore",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Restore a soft-deleted country organization size",
        params: RestoreCountryOrganizationSizeParamsSchema,
        response: {
          200: RestoreCountryOrganizationSizeResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    restoreCountryOrganizationSizeHandler
  );
};
