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
// SameSite must match `chatbot_session_id` (see helpers/identity.ts): both
// cookies ride the same `credentials: "include"` requests.
//
// The widget calls every chatbot endpoint through a RELATIVE `/api/...` path
// (apps/web/src/components/Chatbot/useChatStream.ts and
// useConversationRehydrate.ts), so the deployment's edge has to serve the API
// from the web app's own origin — `credentials: "include"` is belt-and-braces
// there, not a cross-site dependency. `none` rather than `lax` is kept
// deliberately for the topology where that edge forwards to a different
// registrable domain: a Lax cookie is not sent on those requests, so the
// rehydrate endpoint would never see it and conversation persistence would
// silently do nothing. SameSite=None requires Secure, which prod already sets.
//
// Note this attribute governs whether the BROWSER SENDS the cookie, not
// whether page JS can read it: the client-side reset in
// apps/web/src/components/Chatbot/conversationCookie.ts depends on the
// same-origin routing above, not on this line.
const baseCookieOptions = () => ({
  httpOnly: false as const,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  secure: IS_PROD,
  path: CHATBOT_CONVERSATION_COOKIE_PATH,
  maxAge: CHATBOT_CONVERSATION_COOKIE_MAX_AGE,
});

/**
 * Parse a conversation id out of a (already unsigned) cookie value.
 *
 * Conversation IDs are positive bigints; anything that does not round-trip
 * cleanly is rejected so a tampered cookie cannot reach Prisma. Shared by both
 * cookie readers — the rehydrate endpoint turns `null` into a 404, the send
 * endpoint turns it into a fresh conversation.
 */
export const parseConversationIdOrNull = (raw: string): bigint | null => {
  if (!/^\d+$/.test(raw)) return null;
  try {
    const value = BigInt(raw);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
};

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
  // Mirror baseCookieOptions() so the clearing cookie matches the one being
  // cleared — a browser only overwrites a cookie whose attributes line up.
  const serialized = reply.server.serializeCookie(
    CHATBOT_CONVERSATION_COOKIE_NAME,
    "",
    {
      ...baseCookieOptions(),
      maxAge: 0,
    }
  );
  appendSetCookieHeader(reply, serialized);
};
