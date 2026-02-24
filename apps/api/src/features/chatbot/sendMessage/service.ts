import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import {
  AI_FOUNDRY_ENDPOINT,
  AI_FOUNDRY_AGENT_NAME,
} from "@/config/environment.js";
import type { ChatMessageRequest, ChatMessageResponse } from "@repo/types";

export const sendChatMessageService = async (
  data: ChatMessageRequest
): Promise<ChatMessageResponse> => {
  const client = new AIProjectClient(
    AI_FOUNDRY_ENDPOINT,
    new DefaultAzureCredential()
  );

  const openAIClient = await client.getOpenAIClient();

  const conversation = await openAIClient.conversations.create({
    items: [
      {
        type: "message",
        role: "user",
        content: data.message,
      },
    ],
  });

  const response = await openAIClient.responses.create(
    {
      conversation: conversation.id,
    },
    {
      body: { agent: { name: AI_FOUNDRY_AGENT_NAME, type: "agent_reference" } },
    }
  );

  await openAIClient.conversations.delete(conversation.id);

  return { response: response.output_text };
};