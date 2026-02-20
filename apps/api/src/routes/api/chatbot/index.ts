import type { FastifyZodInstance } from "@/types/fastify.js";
import { sendChatMessageRoute } from "@/features/chatbot/sendMessage/route.js";

export default function chatbotRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  sendChatMessageRoute(fastify);
}
