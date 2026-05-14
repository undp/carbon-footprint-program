import { z } from "zod";
import { GetCurrentConversationResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { chatbotIdentityPreHandler } from "@/features/chatbot/helpers/identity.js";
import { getCurrentConversationHandler } from "./handler.js";

export const getCurrentConversationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/conversations/me/current",
    {
      config: { public: options?.public ?? true },
      schema: {
        tags: ["chatbot"],
        summary: "Get the caller's active conversation (rehydrate on mount)",
        description:
          "Returns the conversation pinned by the signed `chatbot_conversation_id` cookie when it is within its TTL window AND the request identity (user_id for authenticated callers, session_id with user_id IS NULL for anonymous callers) matches the row. 204 when the cookie is absent; 404 when the cookie is present but the row is expired or the identity does not match — the response clears the stale cookie in that case.",
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
