import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteMagnitudeHandler } from "./handler.js";
import { DeleteMagnitudeParamsSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteMagnitudeRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["magnitudes"],
        summary: "Soft-delete a magnitude",
        description:
          "Soft-deletes a custom magnitude with no measurement-unit references. System magnitudes and referenced magnitudes are rejected.",
        params: DeleteMagnitudeParamsSchema,
        response: {
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    deleteMagnitudeHandler
  );
};
