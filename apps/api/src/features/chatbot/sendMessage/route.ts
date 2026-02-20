import { sendChatMessageHandler } from "./handler.js";
import {
  ChatMessageRequestSchema,
  ChatMessageResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const sendChatMessageRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["chatbot"],
        summary: "Send a message to the HuellaLatam chatbot",
        description:
          "Sends a user message to the Azure AI Foundry agent and returns the generated response.",
        body: ChatMessageRequestSchema,
        response: {
          200: ChatMessageResponseSchema,
          400: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    sendChatMessageHandler
  );
};
