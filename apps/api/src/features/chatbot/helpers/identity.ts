import { randomUUID } from "node:crypto";
import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { IS_PROD } from "@/config/environment.js";

export type ChatbotIdentity =
  { kind: "user"; userId: bigint } | { kind: "session"; sessionId: string };

export const CHATBOT_SESSION_COOKIE_NAME = "chatbot_session_id";
export const CHATBOT_SESSION_COOKIE_PATH = "/api/chatbot";
export const CHATBOT_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const baseCookieOptions = () => ({
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: IS_PROD,
  path: CHATBOT_SESSION_COOKIE_PATH,
  maxAge: CHATBOT_SESSION_COOKIE_MAX_AGE,
});

const readSignedSessionCookie = (request: FastifyRequest): string | null => {
  const raw = request.cookies?.[CHATBOT_SESSION_COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  return unsigned.value;
};

// `reply.setCookie()` from @fastify/cookie buffers cookies in an internal
// per-reply Map and only flushes them to the Set-Cookie header during the
// onSend hook. The /api/chatbot/message handler calls `reply.hijack()`, which
// skips onSend entirely — so a cookie set via reply.setCookie() never reaches
// the client and every anonymous turn mints a fresh sessionId. To avoid that,
// we sign + serialize manually and write the header directly into Fastify's
// reply store, where reply.getHeader("set-cookie") (called from
// writeSseHeaders before reply.raw.writeHead) can read it back. This also
// works on non-hijacked paths: onSend's plugin handler sees an empty Map and
// is a no-op, leaving our header intact for normal serialization.
const refreshSessionCookie = (reply: FastifyReply, sessionId: string) => {
  const signedValue = reply.signCookie(sessionId);
  reply.header(
    "Set-Cookie",
    reply.server.serializeCookie(
      CHATBOT_SESSION_COOKIE_NAME,
      signedValue,
      baseCookieOptions()
    )
  );
};

/**
 * Resolve the caller identity for chatbot endpoints into
 * `request.chatbotIdentity` without ever responding 401.
 *
 * - Authenticated callers (`request.currentUser`) win — `{ kind: "user", userId }`.
 * - Otherwise, if a valid signed `chatbot_session_id` cookie is present,
 *   `{ kind: "session", sessionId }`. The cookie is re-issued (sliding 30d).
 * - Otherwise, when `requireIdentity` is true, mint a new UUID v4 session and
 *   set the signed cookie. When false, leave `chatbotIdentity` undefined.
 */
export const chatbotIdentityPreHandler = ({
  requireIdentity,
}: {
  requireIdentity: boolean;
}): preHandlerAsyncHookHandler => {
  return async (request, reply) => {
    if (
      request.currentUser?.id !== undefined &&
      request.currentUser?.id !== null
    ) {
      const userId =
        typeof request.currentUser.id === "bigint"
          ? request.currentUser.id
          : BigInt(request.currentUser.id);
      request.chatbotIdentity = { kind: "user", userId };
      return;
    }

    const existingSessionId = readSignedSessionCookie(request);
    if (existingSessionId) {
      request.chatbotIdentity = {
        kind: "session",
        sessionId: existingSessionId,
      };
      refreshSessionCookie(reply, existingSessionId);
      return;
    }

    if (!requireIdentity) {
      return;
    }

    const newSessionId = randomUUID();
    refreshSessionCookie(reply, newSessionId);
    request.chatbotIdentity = { kind: "session", sessionId: newSessionId };
  };
};
