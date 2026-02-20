import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { ChatMessageResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@azure/ai-projects", () => {
  const mockResponses = {
    create: vi.fn().mockResolvedValue({
      output_text: "Las emisiones de carbono son gases de efecto invernadero.",
    }),
  };

  const mockConversations = {
    create: vi.fn().mockResolvedValue({ id: "mock-conversation-id" }),
  };

  const mockOpenAIClient = {
    conversations: mockConversations,
    responses: mockResponses,
  };

  const mockAgent = { name: "HuellaLatamChatBot" };

  const mockAgents = {
    get: vi.fn().mockResolvedValue(mockAgent),
  };

  return {
    AIProjectClient: vi.fn().mockImplementation(() => ({
      agents: mockAgents,
      getOpenAIClient: vi.fn().mockResolvedValue(mockOpenAIClient),
    })),
  };
});

describe("POST /api/chatbot - Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Successful response", () => {
    it("should return 200 with a response string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/chatbot",
        payload: {
          message: "¿Qué es una huella de carbono?",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ChatMessageResponse;
      expect(body.response).toBeTruthy();
      expect(typeof body.response).toBe("string");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when message is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/chatbot",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when message is an empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/chatbot",
        payload: { message: "" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when message exceeds 4000 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/chatbot",
        payload: { message: "a".repeat(4001) },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
