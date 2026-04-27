import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  DeleteCountrySubsectorParamsSchema,
  DeleteCountrySubsectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySubsectorHandler } from "./handler.js";

export const deleteCountrySubsectorRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Soft-delete a country subsector",
        params: DeleteCountrySubsectorParamsSchema,
        response: {
          200: DeleteCountrySubsectorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    deleteCountrySubsectorHandler
  );
};
