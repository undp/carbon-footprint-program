import type { FastifyRequest, FastifyReply } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type { SendMessageRequestBody } from "@repo/types";
import { CHATBOT_MAX_OUTPUT_TOKENS } from "@/config/constants.js";
import { CHATBOT_GENERIC_ERROR_MESSAGE } from "@/features/chatbot/constants.js";
import { getLlmProvider } from "@/features/chatbot/llmProvider/index.js";
import type { LlmMessage } from "@/features/chatbot/llmProvider/types.js";
import {
  acquireIdentityAdvisoryLock,
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

  // History snapshot, turn cap, and message inserts ALL run inside the
  // identity-scoped advisory lock. Doing the cap checks pre-lock would let two
  // concurrent first-message turns each pass on the same stale snapshot, and
  // the prompt sent to the model could miss the immediately preceding turn.
  // The transaction is closed before invoking the LLM provider so the lock is
  // not held for the duration of the stream.
  const { assistantRowId, conversationId, history } = await prisma.$transaction(
    async (tx) => {
      await acquireIdentityAdvisoryLock(tx, identity);
      const conversation = await resolveOrCreateConversation(tx, identity);

      const lockedHistory = await loadConversationHistory(tx, conversation.id);
      enforceHistoryCap(lockedHistory);
      await enforceTurnCap(tx, conversation.id);

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
        history: lockedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
    }
  );

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
  let clientDisconnected = false;
  reply.raw.on("close", () => {
    if (reply.raw.writableEnded) return;
    clientDisconnected = true;
    abortController.abort();
    // Fire-and-forget — but log failures so a dropped DB connection
    // during cleanup is visible in production observability instead of
    // disappearing into an unhandled rejection.
    prisma.$executeRaw`UPDATE chatbot_chat_message SET truncated = true, content = ${assistantBuffer} WHERE id = ${assistantRowId} AND latency_ms IS NULL`.catch(
      (err: unknown) => {
        request.log.error(
          { err, assistantRowId: assistantRowId.toString() },
          "chatbot disconnect-finalizer UPDATE failed"
        );
      }
    );
  });

  // provider.streamCompletion is an async generator: calling it only builds
  // the iterator and cannot throw synchronously — the provider body (the
  // network call included) runs lazily inside the `for await` below. A
  // pre-stream failure is therefore impossible, so every provider error
  // surfaces as a terminal SSE `error` event mid-stream (handled in the catch
  // below), never as a pre-stream HTTP status.
  const stream = provider.streamCompletion(llmMessages, {
    maxOutputTokens: CHATBOT_MAX_OUTPUT_TOKENS,
    signal: abortController.signal,
  });

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
    // If the client already disconnected, the reply.raw "close" handler owns
    // finalization (it marks the row truncated via the conditional UPDATE) and
    // the socket is gone — do not write to it or double-finalize here.
    if (clientDisconnected) {
      return;
    }
    // Genuine provider error while the client is still connected. The "close"
    // handler will NOT finalize the row here: reply.raw.end() below sets
    // writableEnded=true synchronously, so the close handler's
    // `if (reply.raw.writableEnded) return` guard short-circuits before it can
    // run the UPDATE. Finalize the row explicitly instead — persist any
    // partial buffer and mark it truncated, leaving latency_ms NULL so
    // loadConversationHistory excludes this failed turn from future prompts.
    try {
      await prisma.chatbotChatMessage.updateMany({
        where: { id: assistantRowId, latencyMs: null },
        data: { truncated: true, content: assistantBuffer },
      });
    } catch (finalizeErr) {
      request.log.error(
        { err: finalizeErr, assistantRowId: assistantRowId.toString() },
        "chatbot mid-stream error finalizer UPDATE failed"
      );
    }
    writeSseEvent(reply, "error", {
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    reply.raw.end();
    return;
  }

  // Provider implementations honor `options.signal` and may return without
  // throwing when the abort fires (the client disconnected mid-stream).
  // Bail out before the success finalizer would overwrite the truncated
  // state set by the disconnect handler — otherwise an aborted turn could
  // be persisted as a successful completion.
  if (clientDisconnected || abortController.signal.aborted) {
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
