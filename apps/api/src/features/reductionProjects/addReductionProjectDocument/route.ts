import { addReductionProjectDocumentHandler } from "./handler.js";
import {
  AddReductionProjectDocumentParamsSchema,
  AddReductionProjectDocumentBodySchema,
  AddReductionProjectDocumentResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const addReductionProjectDocumentRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/documents",
    {
      schema: {
        tags: ["reduction-projects"],
        summary: "Add a document to a reduction project",
        description: "Adds a document (metadata only) to a DRAFT project",
        params: AddReductionProjectDocumentParamsSchema,
        body: AddReductionProjectDocumentBodySchema,
        response: {
          201: AddReductionProjectDocumentResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    addReductionProjectDocumentHandler
  );
};
