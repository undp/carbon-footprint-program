import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyZodInstance } from "@/types/fastify.js";

// The chatbot route group registers only when CHATBOT_ENABLED is true (DPG
// optionality — a deployment can run the platform with no AI). CHATBOT_ENABLED
// is read once at module load in config/environment.ts, so each case stubs that
// module and imports the route module fresh.

type RouteSpy = {
  addHook: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  requireAuth: ReturnType<typeof vi.fn>;
};

const makeFastifySpy = (): RouteSpy => ({
  addHook: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  requireAuth: vi.fn(),
});

const loadChatbotRoutes = async (chatbotEnabled: boolean) => {
  const actual = await vi.importActual("@/config/environment.js");
  vi.doMock("@/config/environment.js", () => ({
    ...actual,
    CHATBOT_ENABLED: chatbotEnabled,
  }));
  const mod = await import("@/routes/api/chatbot/index.js");
  return mod.default;
};

describe("chatbot route gate — CHATBOT_ENABLED (optionality)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@/config/environment.js");
    vi.resetModules();
  });

  it("registers no routes when the chatbot is disabled", async () => {
    const chatbotRoutes = await loadChatbotRoutes(false);
    const fastify = makeFastifySpy();

    chatbotRoutes(fastify as unknown as FastifyZodInstance);

    expect(fastify.addHook).not.toHaveBeenCalled();
    expect(fastify.post).not.toHaveBeenCalled();
    expect(fastify.delete).not.toHaveBeenCalled();
  });

  it("registers the auth hook + both endpoints when the chatbot is enabled", async () => {
    const chatbotRoutes = await loadChatbotRoutes(true);
    const fastify = makeFastifySpy();

    chatbotRoutes(fastify as unknown as FastifyZodInstance);

    expect(fastify.addHook).toHaveBeenCalledWith(
      "onRequest",
      fastify.requireAuth
    );
    expect(fastify.post).toHaveBeenCalledTimes(1); // POST /message
    expect(fastify.delete).toHaveBeenCalledTimes(1); // DELETE /conversations/me
  });
});
