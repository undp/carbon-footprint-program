import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  RestoreCountrySectorParamsSchema,
  RestoreCountrySectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreCountrySectorHandler } from "./handler.js";

export const restoreCountrySectorRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/:id/restore",
    {
      schema: {
        tags: ["admin-country-sectors"],
        summary: "Restore a soft-deleted country sector",
        description:
          "Transitions the row from DELETED to ACTIVE. Rejected (409) if a currently-ACTIVE row with the same (countryId, name) exists.",
        params: RestoreCountrySectorParamsSchema,
        response: {
          200: RestoreCountrySectorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    restoreCountrySectorHandler
  );
};
