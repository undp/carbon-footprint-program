import { StandardRouteSignature } from "@/routes/api/index.js";
import { duplicateMethodologyHandler } from "./handler.js";
import {
  DuplicateMethodologyParamsSchema,
  DuplicateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const duplicateMethodologyRoute: StandardRouteSignature = (
  fastify,
  options
) => {
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
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    duplicateMethodologyHandler
  );
};
