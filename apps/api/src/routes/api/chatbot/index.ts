import type { FastifyZodInstance } from "@/types/fastify.js";
import { CHATBOT_ENABLED } from "@/config/environment.js";
import { sendMessageRoute } from "@/features/chatbot/sendMessage/route.js";
import { deleteMyConversationRoute } from "@/features/chatbot/deleteMyConversation/route.js";

export default function chatbotRoutes(fastify: FastifyZodInstance) {
  // Chatbot is an optional AI feature (DPG optionality). When disabled, its
  // routes are not registered at all — the endpoints 404 and no LLM/cloud code
  // path is reachable.
  if (!CHATBOT_ENABLED) return;

  // requireAuth is permissive here (each route sets config.allowPublicAccess):
  // it populates request.currentUser for authenticated callers, and anonymous
  // ones fall through to the chatbotIdentity preHandler that mints a session
  // cookie.
  fastify.addHook("onRequest", fastify.requireAuth);
  sendMessageRoute(fastify);
  deleteMyConversationRoute(fastify);
}
