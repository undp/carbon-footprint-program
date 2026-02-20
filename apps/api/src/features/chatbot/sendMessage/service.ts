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

  // Locate the existing agent by name (listAgents returns by ID, not name)
  let agentId: string | undefined;
  for await (const agent of client.agents.listAgents()) {
    if (agent.name === AI_FOUNDRY_AGENT_NAME) {
      agentId = agent.id;
      break;
    }
  }
  if (!agentId) {
    throw new Error(`Agent "${AI_FOUNDRY_AGENT_NAME}" not found`);
  }

  // Create a thread, send the user message, and run the agent
  const thread = await client.agents.threads.create();
  await client.agents.messages.create(thread.id, "user", data.message);
  const run = await client.agents.runs.createAndPoll(thread.id, agentId);

  if (run.status !== "completed") {
    throw new Error(`Agent run failed with status: ${run.status}`);
  }

  // Extract the last assistant reply
  for await (const message of client.agents.messages.list(thread.id, {
    order: "desc",
  })) {
    if (message.role === "assistant") {
      const textBlock = message.content.find((c) => c.type === "text");
      if (textBlock && "text" in textBlock) {
        return { response: textBlock.text.value };
      }
    }
  }

  throw new Error("No assistant response found");
};
