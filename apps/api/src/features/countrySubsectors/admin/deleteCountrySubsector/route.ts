import { z } from "zod";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { DeleteCountrySubsectorParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySubsectorHandler } from "./handler.js";

export const deleteCountrySubsectorRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-subsectors"],
        summary: "Soft-delete a country subsector",
        description:
          "Transitions the row to status=DELETED. Blocked when ACTIVE catalog references (main activities, subcategory recommendations) point at it.",
        params: DeleteCountrySubsectorParamsSchema,
        response: {
          200: z.null().describe("Successfully soft-deleted"),
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    deleteCountrySubsectorHandler
  );
};
