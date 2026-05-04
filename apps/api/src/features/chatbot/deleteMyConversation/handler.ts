import type { FastifyRequest, FastifyReply } from "fastify";
import { clearSessionCookie } from "@/features/chatbot/helpers/clearSessionCookie.js";
import {
  deleteConversationsForSession,
  deleteConversationsForUser,
} from "./service.js";

export const deleteMyConversationHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const identity = request.chatbotIdentity;
  const prisma = request.server.prisma;

  if (identity?.kind === "user") {
    await deleteConversationsForUser(prisma, identity.userId);
  } else if (identity?.kind === "session") {
    await deleteConversationsForSession(prisma, identity.sessionId);
    clearSessionCookie(reply);
  }

  reply.code(204).send();
};
