import { z } from "zod";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { chatbotIdentityPreHandler } from "@/features/chatbot/helpers/identity.js";
import { deleteMyConversationHandler } from "./handler.js";

export const deleteMyConversationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/conversations/me",
    {
      config: { public: options?.public ?? true },
      schema: {
        tags: ["chatbot"],
        summary: "Delete all conversations bound to the caller identity",
        description:
          "Idempotent. Authenticated callers match by user_id; anonymous callers match by signed session cookie. No identity returns 204 with no Set-Cookie.",
        response: {
          204: z.null(),
          500: ApiErrorResponseSchema,
        },
      },
      preHandler: [chatbotIdentityPreHandler({ requireIdentity: false })],
    },
    deleteMyConversationHandler
  );
};
