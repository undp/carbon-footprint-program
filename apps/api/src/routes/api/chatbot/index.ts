import type { FastifyZodInstance } from "@/types/fastify.js";
import { sendMessageRoute } from "@/features/chatbot/sendMessage/route.js";
import { deleteMyConversationRoute } from "@/features/chatbot/deleteMyConversation/route.js";
import { getCurrentConversationRoute } from "@/features/chatbot/getCurrentConversation/route.js";

export default function chatbotRoutes(fastify: FastifyZodInstance) {
  // requireAuth is permissive here (each route is public:true): it populates
  // request.currentUser for authenticated callers, and anonymous ones fall
  // through to the chatbotIdentity preHandler that mints a session cookie.
  fastify.addHook("onRequest", fastify.requireAuth);
  sendMessageRoute(fastify, { public: true });
  deleteMyConversationRoute(fastify, { public: true });
  getCurrentConversationRoute(fastify, { public: true });
}
