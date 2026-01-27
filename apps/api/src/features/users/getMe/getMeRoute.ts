import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMeHandler } from "./getMeHandler.js";
import { GetMeResponseSchema } from "@repo/types";
import {
  ValidationErrorResponseSchema,
  ErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const getMeRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/me",
    {
      schema: {
        tags: ["users"],
        summary: "Get user by idpUserId or email",
        description: "Find a user by idpUserId. Returns null if not found",
        response: {
          200: GetMeResponseSchema,
          400: ValidationErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },

    getMeHandler
  );
};
