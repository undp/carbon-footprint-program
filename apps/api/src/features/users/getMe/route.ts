import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMeHandler } from "./handler.js";
import { GetMeResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

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
          400: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },

    getMeHandler
  );
};
