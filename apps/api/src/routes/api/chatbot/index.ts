import type { FastifyZodInstance } from "@/types/fastify.js";
import { sendMessageRoute } from "@/features/chatbot/sendMessage/route.js";
import { deleteMyConversationRoute } from "@/features/chatbot/deleteMyConversation/route.js";

export default function chatbotRoutes(fastify: FastifyZodInstance) {
  // Both endpoints handle their own identity resolution via the feature-local
  // preHandler. No group-level auth hook — anonymous callers must be allowed.
  sendMessageRoute(fastify, { public: true });
  deleteMyConversationRoute(fastify, { public: true });
}
