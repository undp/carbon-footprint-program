import { z } from "zod";
import {
  GetCurrentConversationQuerySchema,
  GetCurrentConversationResponseSchema,
  type GetCurrentConversationQuery,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { chatbotIdentityPreHandler } from "@/features/chatbot/helpers/identity.js";
import { getCurrentConversationHandler } from "./handler.js";

export const getCurrentConversationRoute = (
  fastify: FastifyZodInstance
): void => {
  fastify.get<{ Querystring: GetCurrentConversationQuery }>(
    "/conversations/me/current",
    {
      config: { allowPublicAccess: true },
      schema: {
        tags: ["chatbot"],
        summary: "Get the caller's active conversation (rehydrate on mount)",
        description:
          "Returns the conversation named by the `conversationId` query parameter when it is within its TTL window AND the request identity (user_id for authenticated callers, session_id with user_id IS NULL for anonymous callers) matches the row. 204 when the parameter is absent; 404 when it is present but the row is expired, missing, or owned by another identity — the client drops its stored id on that status.",
        querystring: GetCurrentConversationQuerySchema,
        response: {
          200: GetCurrentConversationResponseSchema,
          204: z.null(),
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      preHandler: [chatbotIdentityPreHandler({ requireIdentity: false })],
    },
    getCurrentConversationHandler
  );
};
