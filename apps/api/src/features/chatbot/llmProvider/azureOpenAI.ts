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
} from "@/config/environment.js";
import type {
  LLMProvider,
  LlmMessage,
  LlmStreamEvent,
  LlmStreamOptions,
  LlmToolDefinition,
} from "./types.js";
import { estimateTokens } from "./estimateTokens.js";

const AZURE_COGNITIVE_SCOPE = "https://cognitiveservices.azure.com/.default";

const buildClient = (): AzureOpenAI => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT_NAME) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT_NAME must be set when LLM_PROVIDER=azure-openai."
    );
  }
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

const messageToOpenAi = (m: LlmMessage): ChatCompletionMessageParam => {
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

type ToolCallAccumulator = {
  id: string;
  name: string;
  arguments: string;
};

export const azureOpenAIProvider: LLMProvider = {
  async *streamCompletion(
    messages: LlmMessage[],
    options: LlmStreamOptions
  ): AsyncIterable<LlmStreamEvent> {
    const client = getClient();
    const openAiMessages = messages.map(messageToOpenAi);
    const tools = toolsToOpenAi(options.tools);
    const stream = await client.chat.completions.create(
      {
        model: AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: openAiMessages,
        max_tokens: options.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...(tools ? { tools, tool_choice: "auto" as const } : {}),
      },
      { signal: options.signal }
    );

    let outputBuffer = "";
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    const toolCallAccumulators = new Map<number, ToolCallAccumulator>();
    let finishReason: string | null | undefined;

    for await (const chunk of stream) {
      if (options.signal?.aborted) return;
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
  },
};
