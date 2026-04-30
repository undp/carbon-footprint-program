import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  UpdateCountrySectorParamsSchema,
  UpdateCountrySectorRequestSchema,
  UpdateCountrySectorResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateCountrySectorHandler } from "./handler.js";

export const updateCountrySectorRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["admin-country-sectors"],
        summary: "Update a country sector",
        description:
          "Updates the name and/or description of a country sector. Status is not changeable here.",
        params: UpdateCountrySectorParamsSchema,
        body: UpdateCountrySectorRequestSchema,
        response: {
          200: UpdateCountrySectorResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    updateCountrySectorHandler
  );
};
