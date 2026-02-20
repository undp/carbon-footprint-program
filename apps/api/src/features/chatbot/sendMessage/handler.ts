import type { FastifyReply, FastifyRequest } from "fastify";
import { sendChatMessageService } from "./service.js";
import type { ChatMessageRequest } from "@repo/types";

export const sendChatMessageHandler = async (
  request: FastifyRequest<{ Body: ChatMessageRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "chatbot" });
  log.info("Processing chat message...");

  const result = await sendChatMessageService(request.body);

  log.info("Chat response generated successfully");
  return reply.status(200).send(result);
};
