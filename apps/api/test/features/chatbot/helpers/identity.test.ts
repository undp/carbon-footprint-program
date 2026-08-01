import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  CHATBOT_SESSION_COOKIE_NAME,
  baseCookieOptions,
  chatbotIdentityPreHandler,
} from "@/features/chatbot/helpers/identity.js";

// Unit tests for the chatbot identity resolution preHandler. It never responds
// 401: an authenticated user wins, else a valid signed session cookie, else
// (when required) a freshly-minted session. Driven with fake request/reply
// objects — no HTTP, no cookie plugin — so every branch is exercised directly.

type UnsignResult = { valid: boolean; value: string | null };

const makeRequest = (opts: {
  currentUser?: { id: bigint | number } | null;
  cookie?: string;
  unsign?: UnsignResult;
}): FastifyRequest => {
  return {
    currentUser: opts.currentUser ?? undefined,
    cookies: opts.cookie ? { [CHATBOT_SESSION_COOKIE_NAME]: opts.cookie } : {},
    unsignCookie: vi.fn(
      (): UnsignResult => opts.unsign ?? { valid: false, value: null }
    ),
  } as unknown as FastifyRequest;
};

const makeReply = () => {
  const header = vi.fn();
  const reply = {
    signCookie: vi.fn((value: string) => `signed(${value})`),
    header,
    server: {
      serializeCookie: vi.fn(
        (name: string, value: string) => `${name}=${value}`
      ),
    },
  };
  return { reply: reply as unknown as FastifyReply, header };
};

// The preHandler is typed with a `this: FastifyInstance` context; invoke it as a
// plain function for the test (the hook body never touches `this`).
const run = (
  requireIdentity: boolean,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> =>
  (
    chatbotIdentityPreHandler({ requireIdentity }) as unknown as (
      req: FastifyRequest,
      rep: FastifyReply
    ) => Promise<void>
  )(request, reply);

describe("chatbotIdentityPreHandler", () => {
  it("resolves an authenticated bigint user id to a user identity", async () => {
    const request = makeRequest({ currentUser: { id: 42n } });
    const { reply, header } = makeReply();

    await run(true, request, reply);

    expect(request.chatbotIdentity).toEqual({ kind: "user", userId: 42n });
    // Authenticated callers never get a session cookie.
    expect(header).not.toHaveBeenCalled();
  });

  it("coerces a non-bigint user id to a bigint", async () => {
    const request = makeRequest({ currentUser: { id: 7 } });
    const { reply } = makeReply();

    await run(false, request, reply);

    expect(request.chatbotIdentity).toEqual({ kind: "user", userId: 7n });
  });

  it("resolves a valid signed session cookie and re-issues it (sliding window)", async () => {
    const request = makeRequest({
      cookie: "raw-cookie",
      unsign: { valid: true, value: "sess-123" },
    });
    const { reply, header } = makeReply();

    await run(false, request, reply);

    expect(request.chatbotIdentity).toEqual({
      kind: "session",
      sessionId: "sess-123",
    });
    expect(header).toHaveBeenCalledWith(
      "Set-Cookie",
      expect.stringContaining(CHATBOT_SESSION_COOKIE_NAME)
    );
  });

  it("leaves the identity unset when the cookie fails to unsign and identity is optional", async () => {
    const request = makeRequest({
      cookie: "tampered",
      unsign: { valid: false, value: null },
    });
    const { reply, header } = makeReply();

    await run(false, request, reply);

    expect(request.chatbotIdentity).toBeUndefined();
    expect(header).not.toHaveBeenCalled();
  });

  it("mints a new session and sets the cookie when identity is required", async () => {
    const request = makeRequest({});
    const { reply, header } = makeReply();

    await run(true, request, reply);

    expect(request.chatbotIdentity?.kind).toBe("session");
    const identity = request.chatbotIdentity;
    if (identity?.kind !== "session") {
      throw new Error("expected a session identity");
    }
    expect(identity.sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(header).toHaveBeenCalledWith("Set-Cookie", expect.any(String));
  });
});

describe("baseCookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses Lax/insecure cookies in development (default test env)", () => {
    expect(baseCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/api/chatbot",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("uses SameSite=None/Secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // Disable the chatbot and set a valid CORS origin so re-parsing the env
    // under prod doesn't trip the mock-LLM / COOKIE_SECRET / ALLOWED_ORIGIN
    // boot guards — this test only cares about IS_PROD.
    vi.stubEnv("CHATBOT_ENABLED", "false");
    vi.stubEnv("ALLOWED_ORIGIN", "https://app.example.cl");
    vi.resetModules();
    const mod = await import("@/features/chatbot/helpers/identity.js");

    expect(mod.baseCookieOptions()).toMatchObject({
      sameSite: "none",
      secure: true,
    });
  });
});
