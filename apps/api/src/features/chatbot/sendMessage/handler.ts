import type { FastifyRequest, FastifyReply } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type { SendMessageRequestBody } from "@repo/types";
import {
  CHATBOT_MAX_OUTPUT_TOKENS,
  CHATBOT_MAX_RAG_CONTEXT_TOKENS,
} from "@/config/constants.js";
import { ExternalServiceError } from "@/errors/ExternalServiceError.js";
import {
  CHATBOT_GENERIC_ERROR_MESSAGE,
  CHATBOT_K0_OPENER,
} from "@/features/chatbot/constants.js";
import { getLlmProvider } from "@/features/chatbot/llmProvider/index.js";
import {
  estimateTokens,
  type LlmMessage,
  type LlmStreamEvent,
} from "@/features/chatbot/llmProvider/index.js";
import { SYSTEM_PROMPT_ES } from "@/features/chatbot/prompts/loader.js";
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
import type { Prisma } from "@repo/database";
import type { SourceCitation } from "@repo/types";

type SendMessageRequest = FastifyRequest<{ Body: SendMessageRequestBody }>;

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
      // History does not preserve tool_call_id; foundation never persists
      // TOOL rows so this is unreachable in practice. Skip with a placeholder
      // id rather than hard-fail because typing requires a discriminated branch.
      return {
        role: ChatMessageRole.TOOL,
        content: m.content,
        toolCallId: "history-tool-noop",
      };
  }
};

const buildLlmMessages = (
  history: { role: ChatMessageRole; content: string }[],
  userContent: string
): LlmMessage[] => [
  { role: ChatMessageRole.SYSTEM, content: SYSTEM_PROMPT_ES },
  ...history.map(historyToLlmMessage),
  { role: ChatMessageRole.USER, content: userContent },
];

// The handler peeks the first event of each stream before deciding whether
// to hijack the response (per chatbot-message-streaming spec "Handler
// executes a single round of tool calling server-side"). The previous
// `consumeStream` helper expected a fully-async-iterable input AND
// performed both the hijacked SSE write and the iteration loop in one pass,
// so it could not express the peek-first / decide / drain pattern. Inline
// iterator.next() loops replace it (see body of sendMessageHandler).

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
      // Enforce history cap including the system prompt's contribution.
      enforceHistoryCap([...lockedHistory, { content: SYSTEM_PROMPT_ES }]);
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

  // Probe the first invocation BEFORE hijacking so a synchronous provider
  // failure can fall through to the global error handler.
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

  const assistantRowIdString = assistantRowId.toString();
  const finalSources: SourceCitation[] = [];
  // Mutated as deltas arrive so the disconnect finalizer
  // (reply.raw.on("close")) reads the current partial content even if the
  // stream is cut mid-flight before the drain loop completes.
  const onDelta = (content: string): void => {
    assistantBuffer += content;
  };

  // Peek the first event of the first stream. Per chatbot-message-streaming
  // spec ("Handler executes a single round of tool calling server-side"):
  // the second round runs BEFORE reply.hijack() so its errors map to
  // standard HTTP responses (503 / 500). The peek lets us know the turn
  // shape — non-tool turns still hijack immediately to preserve delta-by-
  // delta streaming; tool turns defer the hijack until the second-round
  // outcome is known.
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

  let usage: { inputTokens: number; outputTokens: number } | null = null;
  const firstEvent = firstPeek.value;

  if (firstEvent.type === "tool_call") {
    // Tool round: execute server-side, then re-invoke once. Hijack stays
    // deferred until either the RAG cap check fails (hijack + terminal
    // SSE error event per spec) or the second round produces a streamable
    // first event (hijack + stream). A second consecutive tool_call here
    // throws ExternalServiceError pre-hijack — Fastify's error handler
    // maps it to HTTP 503 per spec scenario "Second consecutive tool_call
    // aborts the turn".

    // Drain anything left in the first iterator. Per chatbot-llm-provider
    // spec scenario "Tool-call event terminates the stream", the next
    // call to .next() returns done=true immediately — drain defensively
    // so a provider that leaks events post-tool_call still releases its
    // upstream resources.
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
      // Spec scenario "Oversized RAG context aborts the second round"
      // mandates a terminal SSE error event AND truncated=true. Hijack
      // now so the SSE wire is open, then emit the error and the explicit
      // UPDATE before reply.raw.end() (the disconnect-finalizer's
      // writableEnded short-circuit would otherwise skip the mark).
      reply.hijack();
      writeSseHeaders(reply);
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      try {
        await prisma.$executeRaw`UPDATE chatbot_chat_message SET truncated = true, content = ${assistantBuffer} WHERE id = ${assistantRowId}`;
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

    // Peek the second stream's first event. A tool_call here violates
    // the single-round invariant (spec scenario "Second consecutive
    // tool_call aborts the turn") and SHALL be reported as HTTP 503 —
    // throwing ExternalServiceError pre-hijack maps cleanly.
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

    // Second round is going to stream — hijack now, emit the peeked
    // event, drain the rest of the iterator into the wire.
    reply.hijack();
    writeSseHeaders(reply);

    if (secondFirst.type === "delta") {
      onDelta(secondFirst.content);
      writeSseEvent(
        reply,
        undefined,
        { content: secondFirst.content },
        { id: assistantRowIdString }
      );
    } else if (secondFirst.type === "usage") {
      usage = {
        inputTokens: secondFirst.inputTokens,
        outputTokens: secondFirst.outputTokens,
      };
    }

    try {
      let next = await secondIterator.next();
      while (!next.done) {
        if (abortController.signal.aborted) break;
        const event = next.value;
        if (event.type === "delta") {
          onDelta(event.content);
          writeSseEvent(
            reply,
            undefined,
            { content: event.content },
            { id: assistantRowIdString }
          );
        } else if (event.type === "usage") {
          // Token accounting: per chatbot-message-streaming spec scenario
          // "tokens_used on a tool turn uses the SECOND usage event", the
          // persisted tokens_used SHALL come from the second (terminal)
          // usage event ONLY — NOT a sum across both rounds. The first
          // invocation terminates on tool_call (chatbot-llm-provider spec
          // "Tool-call event terminates the stream") and provides no
          // usage. Replace on each new usage event from this stream.
          usage = {
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
          };
        }
        // Per spec, tool_call SHALL NOT appear after deltas on the same
        // stream. A misbehaving provider that emits one here would have
        // its event ignored — we cannot revert the hijack at this point
        // and the terminal `done`/`error` events are the only signal
        // available.
        next = await secondIterator.next();
      }
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 2 },
        "chatbot LLM provider second-round stream errored"
      );
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      reply.raw.end();
      return;
    }

    if (clientDisconnected || abortController.signal.aborted) {
      return;
    }

    for (const validSource of toolResult.validSources) {
      finalSources.push(validSource);
    }
  } else {
    // firstEvent is delta | usage at this point (tool_call branch
    // handled above). Non-tool turn — hijack now and stream the rest
    // delta-by-delta.
    reply.hijack();
    writeSseHeaders(reply);

    if (firstEvent.type === "delta") {
      onDelta(firstEvent.content);
      writeSseEvent(
        reply,
        undefined,
        { content: firstEvent.content },
        { id: assistantRowIdString }
      );
    } else if (firstEvent.type === "usage") {
      usage = {
        inputTokens: firstEvent.inputTokens,
        outputTokens: firstEvent.outputTokens,
      };
    }

    try {
      let next = await firstIterator.next();
      while (!next.done) {
        if (abortController.signal.aborted) break;
        const event = next.value;
        if (event.type === "delta") {
          onDelta(event.content);
          writeSseEvent(
            reply,
            undefined,
            { content: event.content },
            { id: assistantRowIdString }
          );
        } else if (event.type === "usage") {
          usage = {
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
          };
        }
        next = await firstIterator.next();
      }
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 1 },
        "chatbot LLM provider first-round stream errored"
      );
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      reply.raw.end();
      return;
    }

    if (clientDisconnected || abortController.signal.aborted) {
      return;
    }
  }

  const latencyMs = Date.now() - startedAt;
  const tokensUsed = usage ? usage.inputTokens + usage.outputTokens : 0;

  // K=0 override: when the assistant text starts with the opener, the model
  // disclaimed corpus support — drop validSources so wire and text agree.
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
  writeSseEvent(reply, "done", donePayload, {
    id: assistantRowIdString,
  });
  reply.raw.end();
};
