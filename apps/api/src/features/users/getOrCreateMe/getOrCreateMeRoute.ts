import type { FastifyZodInstance } from "@/types/fastify.js";
import { getOrCreateMeHandler } from "./getOrCreateMeHandler.js";
import {
  GetOrCreateMeBodySchema,
  GetOrCreateMeResponseSchema,
} from "@repo/types";

export const getOrCreateMeRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/me",
    {
      schema: {
        tags: ["users"],
        summary: "Get or create user by idpUserId or email",
        description:
          "Find a user by idpUserId or email. Returns null if not found (future: will create anonymous user or session)",
        body: GetOrCreateMeBodySchema,
        response: {
          200: GetOrCreateMeResponseSchema,
        },
      },
    },
    getOrCreateMeHandler
  );
};
