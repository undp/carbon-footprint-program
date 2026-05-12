import type { FastifyRequest, FastifyReply } from "fastify";
import { ChatMessageRole } from "@repo/database/enums";
import type { SendMessageRequestBody } from "@repo/types";
import {
  CHATBOT_MAX_OUTPUT_TOKENS,
  CHATBOT_MAX_RAG_CONTEXT_TOKENS,
} from "@/config/constants.js";
import { ExternalServiceError } from "@/errors/ExternalServiceError.js";
import { CHATBOT_GENERIC_ERROR_MESSAGE } from "@/features/chatbot/constants.js";
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

type ToolCallEvent = Extract<LlmStreamEvent, { type: "tool_call" }>;

type StreamConsumeResult = {
  buffer: string;
  toolCall: ToolCallEvent | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  firstChunkSeen: boolean;
};

const consumeStream = async (
  stream: AsyncIterable<LlmStreamEvent>,
  reply: FastifyReply,
  assistantRowIdString: string,
  signal: AbortSignal,
  onDelta: (content: string) => void
): Promise<StreamConsumeResult> => {
  let buffer = "";
  let toolCall: ToolCallEvent | null = null;
  let usage: { inputTokens: number; outputTokens: number } | null = null;
  let firstChunkSeen = false;
  for await (const event of stream) {
    if (signal.aborted) break;
    if (event.type === "delta") {
      if (!firstChunkSeen) firstChunkSeen = true;
      buffer += event.content;
      // Push the delta to the handler's outer assistantBuffer immediately so
      // the disconnect finalizer's UPDATE captures everything sent to the
      // client up to the disconnect point — not just whatever the most
      // recent fully-resolved consumeStream() returned. Otherwise a mid-
      // stream disconnect persists an empty / stale row even though the
      // user already saw the partial reply on the wire.
      onDelta(event.content);
      writeSseEvent(
        reply,
        undefined,
        { content: event.content },
        { id: assistantRowIdString }
      );
    } else if (event.type === "tool_call") {
      toolCall = event;
    } else if (event.type === "usage") {
      usage = {
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
      };
    }
  }
  return { buffer, toolCall, usage, firstChunkSeen };
};

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

  // Hijack the response so we own the raw stream and Fastify won't try to
  // serialize a JSON body for the 200 response schema.
  reply.hijack();
  writeSseHeaders(reply);

  const assistantRowIdString = assistantRowId.toString();
  const finalSources: SourceCitation[] = [];
  // Mutated by consumeStream's onDelta callback so the disconnect finalizer
  // (reply.raw.on("close")) reads the current partial content even if the
  // stream is cut mid-flight before consumeStream() resolves.
  const onDelta = (content: string): void => {
    assistantBuffer += content;
  };

  let firstResult: StreamConsumeResult;
  try {
    firstResult = await consumeStream(
      firstStream,
      reply,
      assistantRowIdString,
      abortController.signal,
      onDelta
    );
  } catch (err) {
    request.log.error(
      {
        err,
        assistantRowId: assistantRowIdString,
        firstChunkSeen: false,
        round: 1,
      },
      "chatbot LLM provider stream errored"
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

  let usage = firstResult.usage;
  // assistantBuffer was already accumulated incrementally via the onDelta
  // callback (so the disconnect finalizer captured it on early disconnect);
  // overwriting it with firstResult.buffer here would be a no-op on the
  // happy path AND would silently re-introduce stale state if the second
  // round mutates assistantBuffer further.

  if (firstResult.toolCall) {
    // Tool round: execute server-side, then re-invoke once.
    let toolResult;
    try {
      toolResult = await executeSearchKnowledgeTool(
        prisma,
        firstResult.toolCall.arguments
      );
    } catch (err) {
      request.log.error(
        { err, assistantRowId: assistantRowIdString, round: 1 },
        "chatbot searchKnowledge tool execution failed"
      );
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      reply.raw.end();
      return;
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
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
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
            id: firstResult.toolCall.id,
            name: firstResult.toolCall.name,
            arguments: firstResult.toolCall.arguments,
          },
        ],
      },
      {
        role: ChatMessageRole.TOOL,
        content: toolResult.toolResultMessage,
        toolCallId: firstResult.toolCall.id,
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
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      reply.raw.end();
      return;
    }

    let secondResult: StreamConsumeResult;
    try {
      secondResult = await consumeStream(
        secondStream,
        reply,
        assistantRowIdString,
        abortController.signal,
        onDelta
      );
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

    if (secondResult.toolCall) {
      request.log.error(
        { assistantRowId: assistantRowIdString },
        "chatbot LLM provider issued a second consecutive tool_call"
      );
      writeSseEvent(reply, "error", {
        code: "EXTERNAL_SERVICE_ERROR",
        message: CHATBOT_GENERIC_ERROR_MESSAGE,
      });
      reply.raw.end();
      return;
    }

    // assistantBuffer is already up-to-date via onDelta; do NOT add
    // secondResult.buffer here (that would double-count the second-round
    // deltas because every delta was already pushed to assistantBuffer
    // inside consumeStream).
    //
    // Token accounting: per chatbot-message-streaming spec scenario
    // "tokens_used on a tool turn uses the SECOND usage event", the
    // persisted tokens_used SHALL come from the second (terminal) usage
    // event ONLY — NOT a sum across both rounds. The first invocation
    // terminates on tool_call (chatbot-llm-provider spec scenario
    // "Tool-call event terminates the stream") and provides no usage.
    // Replace, do not accumulate.
    if (secondResult.usage) {
      usage = {
        inputTokens: secondResult.usage.inputTokens,
        outputTokens: secondResult.usage.outputTokens,
      };
    }
    for (const validSource of toolResult.validSources) {
      finalSources.push(validSource);
    }
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
