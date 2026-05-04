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
import type {
  LLMProvider,
  LlmMessage,
  LlmStreamEvent,
  LlmStreamOptions,
} from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const AZURE_OPENAI_API_VERSION = "2024-10-21";
const AZURE_COGNITIVE_SCOPE = "https://cognitiveservices.azure.com/.default";

const roleToOpenAi = (
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

const buildClient = (): AzureOpenAI => {
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

export const azureOpenAIProvider: LLMProvider = {
  async *streamCompletion(
    messages: LlmMessage[],
    options: LlmStreamOptions
  ): AsyncIterable<LlmStreamEvent> {
    const client = getClient();
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
    const stream = await client.chat.completions.create(
      {
        model: AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: openAiMessages,
        max_tokens: options.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: options.signal }
    );

    let outputBuffer = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    for await (const chunk of stream) {
      if (options.signal?.aborted) return;
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
  },
};
