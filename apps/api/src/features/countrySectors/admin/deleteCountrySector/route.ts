import { z } from "zod";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { DeleteCountrySectorParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountrySectorHandler } from "./handler.js";

export const deleteCountrySectorRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-sectors"],
        summary: "Soft-delete a country sector",
        description:
          "Transitions the row to status=DELETED. Blocked when ACTIVE catalog references (subsectors, main activities, subcategory recommendations) point at it.",
        params: DeleteCountrySectorParamsSchema,
        response: {
          200: z.null().describe("Successfully soft-deleted"),
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    deleteCountrySectorHandler
  );
};
