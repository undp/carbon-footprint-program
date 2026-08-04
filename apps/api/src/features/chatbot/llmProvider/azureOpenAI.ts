import { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import { ChatMessageRole } from "@repo/database/enums";
import {
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME,
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
} from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const AZURE_OPENAI_API_VERSION = "2024-10-21";
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
 * Stream a chat completion through an injected OpenAI client. Split out from the
 * provider below so the transformation (role mapping, TOOL→user coercion),
 * streaming (delta accumulation), timeout wiring, and usage/token computation
 * can be unit-tested with a fake client — no live Azure endpoint or credential.
 * The provider delegates to this with the real cached client, so behavior is
 * unchanged.
 */
export async function* streamChatCompletion(
  client: AzureOpenAI,
  messages: LlmMessage[],
  options: LlmStreamOptions
): AsyncIterable<LlmStreamEvent> {
  const openAiMessages: ChatCompletionMessageParam[] = messages.map((m) => {
    const role = roleToOpenAi(m.role);
    // The TOOL role requires a tool_call_id we don't track in foundation —
    // foundation never emits TOOL messages, so coerce to a user message
    // shape if one ever leaks through.
    if (role === "tool") {
      return { role: "user", content: m.content };
    }
    return { role, content: m.content };
  });
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
        max_tokens: options.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal }
    );

    let outputBuffer = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    for await (const chunk of stream) {
      if (options.signal?.aborted) return;
      resetIdleTimer();
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        outputBuffer += delta;
        yield { type: "delta", content: delta };
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
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
