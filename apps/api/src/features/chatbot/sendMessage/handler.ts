import type { FastifyRequest, FastifyReply } from "fastify";
import type { Prisma } from "@repo/database";
import { ChatMessageRole } from "@repo/database/enums";
import type { SendMessageRequestBody, SourceCitation } from "@repo/types";
import {
  CHATBOT_MAX_OUTPUT_TOKENS,
  CHATBOT_MAX_RAG_CONTEXT_TOKENS,
} from "@/config/constants.js";
import { ExternalServiceError } from "@/errors/ExternalServiceError.js";
import {
  CHATBOT_GENERIC_ERROR_MESSAGE,
  CHATBOT_K0_OPENER,
} from "@/features/chatbot/constants.js";
import {
  estimateTokens,
  getLlmProvider,
  type LlmMessage,
  type LlmStreamEvent,
} from "@/features/chatbot/llmProvider/index.js";
import { setConversationCookie } from "@/features/chatbot/helpers/conversationCookie.js";
import { getSystemPromptEs } from "@/features/chatbot/prompts/loader.js";
import {
  executeSearchKnowledgeTool,
  searchKnowledgeToolDefinition,
} from "@/features/chatbot/tools/searchKnowledge/index.js";
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

type StreamUsage = { inputTokens: number; outputTokens: number };

const historyToLlmMessage = (m: {
  role: ChatMessageRole;
  content: string;
}): LlmMessage => {
  switch (m.role) {
    case ChatMessageRole.USER:
    case ChatMessageRole.SYSTEM:
      return { role: m.role, content: m.content };
    case ChatMessageRole.ASSISTANT:
      return { role: ChatMessageRole.ASSISTANT, content: m.content };
    case ChatMessageRole.TOOL:
      // History does not preserve tool_call_id, and no TOOL row is ever
      // persisted (the tool round lives entirely within a single turn), so
      // this branch is unreachable in practice. Carry a placeholder id rather
      // than hard-failing, because the discriminated union requires one.
      return {
        role: ChatMessageRole.TOOL,
        content: m.content,
        toolCallId: "history-tool-noop",
      };
  }
};

const buildLlmMessages = (
  history: { role: ChatMessageRole; content: string }[],
  userContent: string,
  systemPrompt: string
): LlmMessage[] => [
  { role: ChatMessageRole.SYSTEM, content: systemPrompt },
  ...history.map(historyToLlmMessage),
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

  // Read (and memoize) the prompt here rather than at module scope: the route
  // module is imported on every boot, including when CHATBOT_ENABLED is off, so
  // a packaging problem must not be able to fail the API's startup.
  const systemPrompt = getSystemPromptEs();

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
      // Count the system prompt against the cap: it is part of every request
      // sent upstream, so excluding it would understate the real token load.
      enforceHistoryCap([...lockedHistory, { content: systemPrompt }]);
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

  // Persistence-across-reload affordance: sliding signed
  // `chatbot_conversation_id` cookie so the widget can rehydrate via GET
  // /conversations/me/current on mount. Set BEFORE reply.hijack() so
  // writeSseHeaders forwards it onto reply.raw.writeHead — once we hijack,
  // Fastify no longer flushes its accumulated headers itself. Re-set on every
  // turn (sliding refresh) because the row's expires_at moves forward on
  // create and the cookie should track it.
  setConversationCookie(reply, conversationId.toString());

  const provider = getLlmProvider();
  const llmMessages = buildLlmMessages(history, content, systemPrompt);

  const startedAt = Date.now();
  const abortController = new AbortController();

  // Single close handler covers both responsibilities:
  //   1. Abort the upstream LLM stream so the provider releases resources.
  //   2. Mark the in-flight assistant row truncated. The conditional WHERE
  //      (`latency_ms IS NULL`) makes the UPDATE a no-op when the success
  //      path has already finalized the row, so this is idempotent.
  let assistantBuffer = "";
  let firstChunkSeen = false;
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

  const assistantRowIdString = assistantRowId.toString();
  // Every write to `usage` happens at this function's top level (never inside
  // `emit`/`drain`), because TypeScript's control-flow analysis ignores
  // assignments made from a nested closure and would narrow it back to `null`.
  let usage: StreamUsage | null = null;
  // Corpus chunks the model actually grounded its answer in. Populated only on
  // a tool turn, and cleared again by the K=0 override below.
  const finalSources: SourceCitation[] = [];
  // Mutated as deltas arrive so the disconnect finalizer
  // (reply.raw.on("close")) reads the current partial content even if the
  // stream is cut mid-flight before the drain loop completes.
  const onDelta = (chunk: string): void => {
    firstChunkSeen = true;
    assistantBuffer += chunk;
  };

  /**
   * Terminal handling for a provider failure that happens AFTER the hijack, so
   * the response head is already on the wire and we cannot fall through to the
   * global error handler. Persists the partial buffer, marks the row truncated,
   * and emits a terminal SSE `error` event.
   */
  const failAfterHijack = async (err: unknown, round: 1 | 2): Promise<void> => {
    request.log.error(
      { err, assistantRowId: assistantRowIdString, firstChunkSeen, round },
      "chatbot LLM provider stream errored"
    );
    // If the client already disconnected, the reply.raw "close" handler owns
    // finalization (it marks the row truncated via the conditional UPDATE) and
    // the socket is gone — do not write to it or double-finalize here.
    if (clientDisconnected) return;
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
        { err: finalizeErr, assistantRowId: assistantRowIdString },
        "chatbot mid-stream error finalizer UPDATE failed"
      );
    }
    writeSseEvent(reply, "error", {
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    reply.raw.end();
  };

  /**
   * Write one stream event to the hijacked wire. Returns the usage totals when
   * the event carries them, so the caller assigns `usage` in the outer scope.
   *
   * Token accounting: on a tool turn the persisted tokens_used comes from the
   * SECOND (terminal) usage event only — never a sum across rounds. The first
   * invocation terminates on tool_call and provides no usage.
   *
   * Per spec, tool_call SHALL NOT appear after deltas on the same stream. A
   * misbehaving provider emitting one here has it ignored: the hijack cannot be
   * reverted, and the terminal done/error events are the only signal left.
   */
  const emit = (event: LlmStreamEvent): StreamUsage | null => {
    if (event.type === "delta") {
      onDelta(event.content);
      writeSseEvent(
        reply,
        undefined,
        { content: event.content },
        { id: assistantRowIdString }
      );
      return null;
    }
    if (event.type === "usage") {
      return {
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
      };
    }
    return null;
  };

  /**
   * Drain an already-peeked iterator onto the wire. `ok: false` means the
   * failure was already reported on the wire and the caller must return.
   */
  const drain = async (
    iterator: AsyncIterator<LlmStreamEvent>,
    round: 1 | 2
  ): Promise<{ ok: boolean; usage: StreamUsage | null }> => {
    let latest: StreamUsage | null = null;
    try {
      let next = await iterator.next();
      while (!next.done) {
        if (abortController.signal.aborted) break;
        latest = emit(next.value) ?? latest;
        next = await iterator.next();
      }
      return { ok: true, usage: latest };
    } catch (err) {
      await failAfterHijack(err, round);
      return { ok: false, usage: latest };
    }
  };

  // Probe the first invocation BEFORE hijacking so a provider failure can fall
  // through to the global error handler as a real HTTP status.
  let firstStream: AsyncIterable<LlmStreamEvent>;
  try {
    firstStream = provider.streamCompletion(llmMessages, {
      maxOutputTokens: CHATBOT_MAX_OUTPUT_TOKENS,
      signal: abortController.signal,
      tools: [searchKnowledgeToolDefinition],
    });
  } catch {
    throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
  }

  // Peek the first event. The handler executes a single round of tool calling
  // server-side, and the second round runs BEFORE reply.hijack() so its errors
  // map to standard HTTP responses (503 / 500). The peek reveals the turn
  // shape: non-tool turns hijack immediately to preserve delta-by-delta
  // streaming; tool turns defer the hijack until the second-round outcome is
  // known.
  const firstIterator = firstStream[Symbol.asyncIterator]();
  let firstPeek: IteratorResult<LlmStreamEvent>;
  try {
    firstPeek = await firstIterator.next();
  } catch (err) {
    request.log.error(
      { err, assistantRowId: assistantRowIdString, round: 1 },
      "chatbot LLM provider first-round peek errored"
    );
    throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
  }
  if (firstPeek.done) {
    request.log.error(
      { assistantRowId: assistantRowIdString, round: 1 },
      "chatbot LLM provider first-round stream produced no events"
    );
    throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
  }

  const firstEvent = firstPeek.value;

  if (firstEvent.type === "tool_call") {
    // Drain anything left in the first iterator. A tool_call event terminates
    // the stream, so the next .next() returns done immediately — drain
    // defensively so a provider that leaks events still releases resources.
    let firstRemaining: IteratorResult<LlmStreamEvent>;
    do {
      firstRemaining = await firstIterator.next();
    } while (!firstRemaining.done);

    let toolResult;
    try {
      toolResult = await executeSearchKnowledgeTool(
        prisma,
        firstEvent.arguments
      );
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 1 },
        "chatbot searchKnowledge tool execution failed"
      );
      throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
    }

    const toolMessageTokens = estimateTokens(toolResult.toolResultMessage);
    if (toolMessageTokens > CHATBOT_MAX_RAG_CONTEXT_TOKENS) {
      request.log.warn(
        {
          assistantRowId: assistantRowIdString,
          toolMessageTokens,
          cap: CHATBOT_MAX_RAG_CONTEXT_TOKENS,
        },
        "chatbot RAG context exceeds CHATBOT_MAX_RAG_CONTEXT_TOKENS"
      );
      // An oversized RAG context aborts the second round with a terminal SSE
      // error AND truncated=true. Hijack now so the wire is open, then emit
      // the error and the explicit UPDATE before reply.raw.end() (the
      // disconnect finalizer's writableEnded short-circuit would otherwise
      // skip the mark).
      reply.hijack();
      writeSseHeaders(reply);
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      try {
        await prisma.chatbotChatMessage.updateMany({
          where: { id: assistantRowId, latencyMs: null },
          data: { truncated: true, content: assistantBuffer },
        });
      } catch (err) {
        request.log.error(
          { err, assistantRowId: assistantRowIdString },
          "chatbot oversized-RAG truncated-mark UPDATE failed"
        );
      }
      reply.raw.end();
      return;
    }

    const secondMessages: LlmMessage[] = [
      ...llmMessages,
      {
        role: ChatMessageRole.ASSISTANT,
        content: "",
        toolCalls: [
          {
            id: firstEvent.id,
            name: firstEvent.name,
            arguments: firstEvent.arguments,
          },
        ],
      },
      {
        role: ChatMessageRole.TOOL,
        content: toolResult.toolResultMessage,
        toolCallId: firstEvent.id,
      },
    ];

    let secondStream: AsyncIterable<LlmStreamEvent>;
    try {
      secondStream = provider.streamCompletion(secondMessages, {
        maxOutputTokens: CHATBOT_MAX_OUTPUT_TOKENS,
        signal: abortController.signal,
        tools: [searchKnowledgeToolDefinition],
      });
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 2 },
        "chatbot LLM provider second-round invocation failed"
      );
      throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
    }

    // Peek the second stream. A tool_call here violates the single-round
    // invariant and SHALL abort the turn — throwing pre-hijack maps cleanly to
    // HTTP 503.
    const secondIterator = secondStream[Symbol.asyncIterator]();
    let secondPeek: IteratorResult<LlmStreamEvent>;
    try {
      secondPeek = await secondIterator.next();
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 2 },
        "chatbot LLM provider second-round peek errored"
      );
      throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
    }
    if (secondPeek.done) {
      request.log.error(
        { assistantRowId: assistantRowIdString, round: 2 },
        "chatbot LLM provider second-round stream produced no events"
      );
      throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
    }
    const secondFirst = secondPeek.value;
    if (secondFirst.type === "tool_call") {
      request.log.error(
        { assistantRowId: assistantRowIdString },
        "chatbot LLM provider issued a second consecutive tool_call"
      );
      throw new ExternalServiceError(CHATBOT_GENERIC_ERROR_MESSAGE);
    }

    // The second round is going to stream — hijack now, emit the peeked event,
    // then drain the rest onto the wire.
    reply.hijack();
    writeSseHeaders(reply);
    usage = emit(secondFirst) ?? usage;
    const drained = await drain(secondIterator, 2);
    usage = drained.usage ?? usage;
    if (!drained.ok) return;

    if (clientDisconnected || abortController.signal.aborted) return;

    finalSources.push(...toolResult.validSources);
  } else {
    // Non-tool turn — hijack now and stream delta-by-delta.
    reply.hijack();
    writeSseHeaders(reply);
    usage = emit(firstEvent) ?? usage;
    const drained = await drain(firstIterator, 1);
    usage = drained.usage ?? usage;
    if (!drained.ok) return;

    // Provider implementations honor `options.signal` and may return without
    // throwing when the abort fires (the client disconnected mid-stream).
    // Bail out before the success finalizer would overwrite the truncated
    // state set by the disconnect handler — otherwise an aborted turn could
    // be persisted as a successful completion.
    if (clientDisconnected || abortController.signal.aborted) return;
  }

  const latencyMs = Date.now() - startedAt;
  const tokensUsed = usage ? usage.inputTokens + usage.outputTokens : 0;

  // K=0 override: when the assistant text opens with the no-corpus-support
  // disclaimer, the model declined to ground its answer — drop validSources so
  // the wire payload and the visible text agree.
  if (assistantBuffer.trimStart().startsWith(CHATBOT_K0_OPENER)) {
    finalSources.length = 0;
  }

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
        sourcesCited: finalSources as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.chatbotChatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  } catch (err) {
    request.log.error(
      { err, assistantRowId: assistantRowIdString },
      "chatbot finalization writes failed after successful stream"
    );
    writeSseEvent(reply, "error", {
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    reply.raw.end();
    return;
  }

  type DonePayload = {
    inputTokens: number;
    outputTokens: number;
    sources?: SourceCitation[];
  };
  const donePayload: DonePayload = {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  };
  if (finalSources.length > 0) {
    donePayload.sources = finalSources;
  }
  writeSseEvent(reply, "done", donePayload, { id: assistantRowIdString });
  reply.raw.end();
};
