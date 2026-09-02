import { AzureOpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import { ChatMessageRole } from "@repo/database/enums";
import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_API_VERSION,
  AZURE_OPENAI_DEPLOYMENT_NAME,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_REASONING_EFFORT,
} from "@/config/environment.js";
import {
  CHATBOT_LLM_STREAM_IDLE_TIMEOUT_MS,
  CHATBOT_LLM_STREAM_TIMEOUT_MS,
} from "@/config/constants.js";
import type {
  LLMProvider,
  LlmMessage,
  LlmStreamEvent,
  LlmStreamOptions,
  LlmToolDefinition,
} from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const AZURE_COGNITIVE_SCOPE = "https://cognitiveservices.azure.com/.default";

export const roleToOpenAi = (
  role: ChatMessageRole
): "system" | "user" | "assistant" | "tool" => {
  switch (role) {
    case ChatMessageRole.USER:
      return "user";
    case ChatMessageRole.ASSISTANT:
      return "assistant";
    case ChatMessageRole.SYSTEM:
      return "system";
    case ChatMessageRole.TOOL:
      return "tool";
  }
};

export const buildClient = (): AzureOpenAI => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT_NAME) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT_NAME must be set when LLM_PROVIDER=azure-openai."
    );
  }
  // API key auth is a documented development-only fallback. Production leaves
  // AZURE_OPENAI_API_KEY unset and authenticates with managed identity below.
  if (AZURE_OPENAI_API_KEY) {
    return new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiVersion: AZURE_OPENAI_API_VERSION,
      deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
      apiKey: AZURE_OPENAI_API_KEY,
    });
  }
  const credential = new DefaultAzureCredential();
  const azureADTokenProvider = getBearerTokenProvider(
    credential,
    AZURE_COGNITIVE_SCOPE
  );
  return new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiVersion: AZURE_OPENAI_API_VERSION,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
    azureADTokenProvider,
  });
};

let cachedClient: AzureOpenAI | null = null;

const getClient = (): AzureOpenAI => {
  if (!cachedClient) cachedClient = buildClient();
  return cachedClient;
};

/**
 * Map one internal message onto its OpenAI wire shape. TOOL messages are
 * first-class here (they carry the `tool_call_id` the API requires) because the
 * RAG phase runs a real tool round — unlike foundation, which never emitted
 * TOOL and coerced it to a user message.
 */
export const messageToOpenAi = (m: LlmMessage): ChatCompletionMessageParam => {
  switch (m.role) {
    case ChatMessageRole.USER:
      return { role: "user", content: m.content };
    case ChatMessageRole.SYSTEM:
      return { role: "system", content: m.content };
    case ChatMessageRole.ASSISTANT: {
      const base: ChatCompletionMessageParam = {
        role: "assistant",
        content: m.content,
      };
      if (m.toolCalls && m.toolCalls.length > 0) {
        return {
          ...base,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }
      return base;
    }
    case ChatMessageRole.TOOL:
      return {
        role: "tool",
        content: m.content,
        tool_call_id: m.toolCallId,
      };
  }
};

const toolsToOpenAi = (
  tools: LlmToolDefinition[] | undefined
): ChatCompletionTool[] | undefined => {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
};

/**
 * Tool calls arrive split across stream chunks: the `id` and `function.name`
 * land on the first delta for an index, then `function.arguments` accumulates
 * as a JSON string over subsequent deltas. Keyed by the wire `index`.
 */
type ToolCallAccumulator = {
  id: string;
  name: string;
  arguments: string;
};

/**
 * Stream a chat completion through an injected OpenAI client. Split out from the
 * provider below so the transformation (message/tool mapping), streaming (delta
 * and tool-call accumulation), timeout wiring, and usage/token computation can
 * be unit-tested with a fake client — no live Azure endpoint or credential.
 * The provider delegates to this with the real cached client, so behavior is
 * unchanged.
 */
export async function* streamChatCompletion(
  client: AzureOpenAI,
  messages: LlmMessage[],
  options: LlmStreamOptions
): AsyncIterable<LlmStreamEvent> {
  const openAiMessages: ChatCompletionMessageParam[] =
    messages.map(messageToOpenAi);
  const tools = toolsToOpenAi(options.tools);
  // Fail fast on a stuck upstream. Two server-side guards abort an internal
  // controller: an overall wall-clock cap and an idle-between-frames cap
  // (reset on every chunk). The internal controller is merged with the
  // caller's disconnect signal, so whichever fires first tears down the SDK
  // request. On a timeout the caller's `options.signal` is NOT aborted, so
  // the SDK's rejection propagates as a thrown error (surfaced by the
  // handler as a terminal SSE error) instead of the silent client-disconnect
  // return below.
  const timeoutController = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const overallTimer = setTimeout(() => {
    timeoutController.abort(
      new Error("Azure OpenAI stream overall timeout exceeded")
    );
  }, CHATBOT_LLM_STREAM_TIMEOUT_MS);
  const clearTimers = () => {
    if (idleTimer) clearTimeout(idleTimer);
    clearTimeout(overallTimer);
  };
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timeoutController.abort(
        new Error("Azure OpenAI stream idle timeout exceeded")
      );
    }, CHATBOT_LLM_STREAM_IDLE_TIMEOUT_MS);
  };
  resetIdleTimer();

  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const stream = await client.chat.completions.create(
      {
        model: AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: openAiMessages,
        max_completion_tokens: options.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...(tools ? { tools, tool_choice: "auto" as const } : {}),
        // Reasoning models (gpt-5 family, o-series) reduce TTFT dramatically
        // when `reasoning_effort: "minimal"` is set. Per-deployment knob via
        // env var — non-reasoning chat models leave it unset because the
        // SDK may reject the field there.
        ...(AZURE_OPENAI_REASONING_EFFORT && {
          reasoning_effort: AZURE_OPENAI_REASONING_EFFORT,
        }),
      },
      { signal }
    );

    let outputBuffer = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    const toolCallAccumulators = new Map<number, ToolCallAccumulator>();
    let finishReason: string | null | undefined;

    for await (const chunk of stream) {
      if (options.signal?.aborted) return;
      resetIdleTimer();
      const choice = chunk.choices[0];
      const delta = choice?.delta?.content;
      if (delta) {
        outputBuffer += delta;
        yield { type: "delta", content: delta };
      }
      const deltaToolCalls = choice?.delta?.tool_calls;
      if (deltaToolCalls) {
        for (const tc of deltaToolCalls) {
          const existing = toolCallAccumulators.get(tc.index) ?? {
            id: "",
            name: "",
            arguments: "",
          };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name = tc.function.name;
          if (tc.function?.arguments)
            existing.arguments += tc.function.arguments;
          toolCallAccumulators.set(tc.index, existing);
        }
      }
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    // Emit accumulated tool calls in wire-index order, before the terminal
    // usage event, so the handler can run the tool round deterministically.
    if (finishReason === "tool_calls" && toolCallAccumulators.size > 0) {
      const sorted = Array.from(toolCallAccumulators.entries()).sort(
        ([a], [b]) => a - b
      );
      for (const [, tc] of sorted) {
        yield {
          type: "tool_call",
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        };
      }
    }

    yield {
      type: "usage",
      inputTokens:
        inputTokens ??
        estimateTokens(messages.map((m) => m.content).join("\n")),
      outputTokens: outputTokens ?? estimateTokens(outputBuffer),
    };
  } finally {
    clearTimers();
  }
}

export const azureOpenAIProvider: LLMProvider = {
  async *streamCompletion(
    messages: LlmMessage[],
    options: LlmStreamOptions
  ): AsyncIterable<LlmStreamEvent> {
    // getClient() is resolved lazily on the first pull (same as before the
    // extraction) and the real cached client drives the shared generator.
    yield* streamChatCompletion(getClient(), messages, options);
  },
};
