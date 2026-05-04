import type { FastifyRequest, FastifyReply } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type { SendMessageRequestBody } from "@repo/types";
import { CHATBOT_MAX_OUTPUT_TOKENS } from "@/config/constants.js";
import { ExternalServiceError } from "@/errors/ExternalServiceError.js";
import { CHATBOT_GENERIC_ERROR_MESSAGE } from "@/features/chatbot/constants.js";
import { getLlmProvider } from "@/features/chatbot/llmProvider/index.js";
import type { LlmMessage } from "@/features/chatbot/llmProvider/types.js";
import {
  acquireIdentityAdvisoryLock,
  conversationIdentityFilter,
  enforceHistoryCap,
  enforceTurnCap,
  enforceUserInputCap,
  loadConversationHistory,
  resolveOrCreateConversation,
} from "./service.js";
import { writeSseEvent, writeSseHeaders } from "./helpers.js";

type SendMessageRequest = FastifyRequest<{ Body: SendMessageRequestBody }>;

const buildLlmMessages = (
  history: { role: ChatMessageRole; content: string }[],
  userContent: string
): LlmMessage[] => [
  ...history.map((m) => ({ role: m.role, content: m.content })),
  { role: ChatMessageRole.USER, content: userContent },
];

export const sendMessageHandler = async (
  request: SendMessageRequest,
  reply: FastifyReply
): Promise<void> => {
  const identity = request.chatbotIdentity;
  if (!identity) {
    throw new Error(
      "chatbotIdentity is missing — preHandler must run before handler."
    );
  }

  const { content } = request.body;
  enforceUserInputCap(content);

  const prisma = request.server.prisma;

  // Pre-transaction: history cap is checked against the CURRENT active
  // conversation (if any). Tolerable because the user message and assistant
  // row will be inserted under the advisory lock below; if a brand-new
  // conversation is created mid-transaction, history is empty.
  const existing = await prisma.chatbotChatConversation.findFirst({
    where: {
      ...conversationIdentityFilter(identity),
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  let history: { role: ChatMessageRole; content: string }[] = [];
  if (existing) {
    history = await loadConversationHistory(prisma, existing.id);
    enforceHistoryCap(history);
    await enforceTurnCap(prisma, existing.id);
  }

  // The transaction holds the advisory lock for the duration of lazy-create +
  // user message insert + empty assistant insert. The lock serializes
  // concurrent first-message turns for the same identity.
  const { assistantRowId, conversationId } = await prisma.$transaction(
    async (tx) => {
      await acquireIdentityAdvisoryLock(tx, identity);
      const conversation = await resolveOrCreateConversation(tx, identity);

      await tx.chatbotChatMessage.create({
        data: {
          conversationId: conversation.id,
          role: ChatMessageRole.USER,
          content,
          tokensUsed: null,
          latencyMs: null,
        },
      });

      const assistantRow = await tx.chatbotChatMessage.create({
        data: {
          conversationId: conversation.id,
          role: ChatMessageRole.ASSISTANT,
          content: "",
          tokensUsed: null,
          latencyMs: null,
        },
        select: { id: true },
      });

      return {
        assistantRowId: assistantRow.id,
        conversationId: conversation.id,
      };
    }
  );

  // If the conversation was newly created in the transaction, history was
  // empty so the cap was already satisfied. If it existed before, we already
  // checked above. Reload history under the new conversation (covers the
  // brand-new case where it's still empty).
  if (!existing) {
    history = [];
  }

  const provider = getLlmProvider();
  const llmMessages = buildLlmMessages(history, content);

  const startedAt = Date.now();
  const abortController = new AbortController();

  // Single close handler covers both responsibilities:
  //   1. Abort the upstream LLM stream so the provider releases resources.
  //   2. Mark the in-flight assistant row truncated. The conditional WHERE
  //      (`latency_ms IS NULL`) makes the UPDATE a no-op when the success
  //      path has already finalized the row, so this is idempotent.
  let assistantBuffer = "";
  reply.raw.on("close", () => {
    if (reply.raw.writableEnded) return;
    abortController.abort();
    void prisma.$executeRaw`UPDATE chatbot_chat_message SET truncated = true, content = ${assistantBuffer} WHERE id = ${assistantRowId} AND latency_ms IS NULL`;
  });

  let stream: AsyncIterable<
    | { type: "delta"; content: string }
    | { type: "usage"; inputTokens: number; outputTokens: number }
  >;
  try {
    stream = provider.streamCompletion(llmMessages, {
      maxOutputTokens: CHATBOT_MAX_OUTPUT_TOKENS,
      signal: abortController.signal,
    });
  } catch {
    throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
  }

  // Hijack the response so we own the raw stream and Fastify won't try to
  // serialize a JSON body for the 200 response schema.
  reply.hijack();
  writeSseHeaders(reply);

  let usage: { inputTokens: number; outputTokens: number } | null = null;
  let firstChunkSeen = false;

  try {
    for await (const event of stream) {
      if (event.type === "delta") {
        if (!firstChunkSeen) firstChunkSeen = true;
        assistantBuffer += event.content;
        writeSseEvent(
          reply,
          undefined,
          { content: event.content },
          {
            id: assistantRowId.toString(),
          }
        );
      } else if (event.type === "usage") {
        usage = {
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
        };
      }
    }
  } catch (err) {
    request.log.error(
      { err, assistantRowId: assistantRowId.toString(), firstChunkSeen },
      "chatbot LLM provider stream errored"
    );
    writeSseEvent(reply, "error", {
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    reply.raw.end();
    // The reply.raw.on("close") handler marks the assistant row truncated
    // via the conditional UPDATE — same path for both pre-stream and
    // mid-stream errors, since headers are already on the wire either way.
    return;
  }

  const latencyMs = Date.now() - startedAt;
  const tokensUsed = usage ? usage.inputTokens + usage.outputTokens : 0;

  // Finalize the assistant row OUTSIDE the transaction. Setting `latency_ms`
  // is what makes the disconnect finalizer's conditional UPDATE a no-op.
  // Wrap the writes in try/catch so a finalization failure (e.g., dropped
  // DB connection right after the stream ended) is logged and surfaced as a
  // terminal SSE error event rather than an unhandled rejection — the
  // response head was sent on `hijack`, so we cannot fall through to the
  // global error handler.
  try {
    await prisma.chatbotChatMessage.update({
      where: { id: assistantRowId },
      data: {
        content: assistantBuffer,
        tokensUsed,
        latencyMs,
        truncated: false,
      },
    });

    await prisma.chatbotChatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  } catch (err) {
    request.log.error(
      { err, assistantRowId: assistantRowId.toString() },
      "chatbot finalization writes failed after successful stream"
    );
    writeSseEvent(reply, "error", {
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    reply.raw.end();
    return;
  }

  writeSseEvent(
    reply,
    "done",
    {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    },
    { id: assistantRowId.toString() }
  );
  reply.raw.end();
};
