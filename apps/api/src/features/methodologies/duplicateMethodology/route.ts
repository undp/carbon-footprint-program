import type { FastifyZodInstance } from "@/types/fastify.js";
import { duplicateMethodologyHandler } from "./handler.js";
import {
  DuplicateMethodologyParamsSchema,
  DuplicateMethodologyResponseSchema,
} from "@repo/types";
import {
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const duplicateMethodologyRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/:id/duplicate",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Duplicate a methodology",
        description: "Create a copy of an existing methodology",
        params: DuplicateMethodologyParamsSchema,
        response: {
          201: DuplicateMethodologyResponseSchema,
          404: NotFoundErrorResponseSchema,
          409: StructuredErrorResponseSchema,
        },
      },
    },
    duplicateMethodologyHandler
  );
};
