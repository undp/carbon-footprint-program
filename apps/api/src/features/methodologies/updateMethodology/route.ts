import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateMethodologyHandler } from "./handler.js";
import {
  UpdateMethodologyParamsSchema,
  UpdateMethodologyRequestSchema,
  UpdateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateMethodologyRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Update a methodology",
        description: "Update an existing methodology by its ID",
        params: UpdateMethodologyParamsSchema,
        body: UpdateMethodologyRequestSchema,
        response: {
          200: UpdateMethodologyResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    updateMethodologyHandler
  );
};
