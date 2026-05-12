import { StandardRouteSignature } from "@/routes/api/index.js";
import { createMethodologyHandler } from "./handler.js";
import {
  CreateMethodologyRequestSchema,
  CreateMethodologyResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createMethodologyRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Create a new methodology",
        description: "Create a new methodology version for a country",
        body: CreateMethodologyRequestSchema,
        response: {
          201: CreateMethodologyResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createMethodologyHandler
  );
};
