import type { FastifyReply, FastifyRequest } from "fastify";
import { IS_PROD } from "@/config/environment.js";
import { CHATBOT_CONVERSATION_TTL_DAYS } from "@/config/constants.js";

export const CHATBOT_CONVERSATION_COOKIE_NAME = "chatbot_conversation_id";
export const CHATBOT_CONVERSATION_COOKIE_PATH = "/api/chatbot";
// Aligned with CHATBOT_CONVERSATION_TTL_DAYS — the row's expires_at and the
// cookie's Max-Age track each other so an expired row never leaves a cookie
// dangling, and a present cookie never points to a freshly-expired row.
export const CHATBOT_CONVERSATION_COOKIE_MAX_AGE =
  CHATBOT_CONVERSATION_TTL_DAYS * 24 * 60 * 60;

// `httpOnly: false` is intentional and asymmetric with `chatbot_session_id`
// (which stays HttpOnly). Rationale captured in design.md Decision 28: the
// signing (COOKIE_SECRET) protects against tampering — an attacker cannot
// forge a conversation_id and hit the GET endpoint to IDOR another user.
// Letting JS read+clear the cookie is required so the "Nueva conversación"
// affordance can drop it client-side without a round-trip. Re-evaluate when
// V4/V5 introduces private data.
const baseCookieOptions = () => ({
  httpOnly: false as const,
  sameSite: "lax" as const,
  secure: IS_PROD,
  path: CHATBOT_CONVERSATION_COOKIE_PATH,
  maxAge: CHATBOT_CONVERSATION_COOKIE_MAX_AGE,
});

export const readSignedConversationCookie = (
  request: FastifyRequest
): string | null => {
  const raw = request.cookies?.[CHATBOT_CONVERSATION_COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  return unsigned.value;
};

// Multi-cookie aware Set-Cookie writer. The chatbot identity preHandler may
// already have written `chatbot_session_id` onto the same reply via
// `reply.header("Set-Cookie", ...)`. A second `reply.header` call with the
// same name would clobber it, so this helper reads the existing header and
// merges. Mirrors the manual serialization used by `refreshSessionCookie` so
// the cookie survives `reply.hijack()` (which skips Fastify's onSend, where
// `reply.setCookie()` would normally flush).
const appendSetCookieHeader = (
  reply: FastifyReply,
  serialized: string
): void => {
  const existing = reply.getHeader("set-cookie");
  if (existing === undefined) {
    reply.header("Set-Cookie", serialized);
    return;
  }
  if (Array.isArray(existing)) {
    reply.header("Set-Cookie", [...existing, serialized]);
    return;
  }
  reply.header("Set-Cookie", [String(existing), serialized]);
};

export const setConversationCookie = (
  reply: FastifyReply,
  conversationId: string
): void => {
  const signed = reply.signCookie(conversationId);
  const serialized = reply.server.serializeCookie(
    CHATBOT_CONVERSATION_COOKIE_NAME,
    signed,
    baseCookieOptions()
  );
  appendSetCookieHeader(reply, serialized);
};

export const clearConversationCookie = (reply: FastifyReply): void => {
  const serialized = reply.server.serializeCookie(
    CHATBOT_CONVERSATION_COOKIE_NAME,
    "",
    {
      httpOnly: false,
      sameSite: "lax",
      secure: IS_PROD,
      path: CHATBOT_CONVERSATION_COOKIE_PATH,
      maxAge: 0,
    }
  );
  appendSetCookieHeader(reply, serialized);
};
