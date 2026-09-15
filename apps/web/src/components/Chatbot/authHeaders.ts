import { getAuthToken } from "@/api/http/auth";

/**
 * Build request headers for the chatbot's calls, carrying the OIDC access
 * token when the visitor is signed in.
 *
 * Every other screen gets this for free from `apiClient`, whose `beforeRequest`
 * hook attaches the token (see api/http/client.ts). The chatbot cannot use that
 * client: the send endpoint answers with an SSE stream, which needs the raw
 * `Response.body` reader, and ky's `afterResponse` hook throws on any non-2xx,
 * which would swallow the 413 and 429 bodies the widget renders as user copy.
 * So it calls `fetch` directly — and has to re-attach the token itself.
 *
 * Omitting it is not a cosmetic bug. Without the header the API's permissive
 * `requireAuth` resolves no user, `request.currentUser` stays unset, and
 * `chatbotIdentityPreHandler` falls through to the anonymous branch — so a
 * signed-in person's conversations are stored against a session cookie rather
 * than their account, and vanish with that cookie. Third-party cookie
 * restrictions make that a routine event, not an edge case.
 *
 * Returns the base headers unchanged for anonymous visitors, who remain
 * supported: the session cookie is their identity.
 */
export const buildChatbotHeaders = async (
  base: Record<string, string> = {}
): Promise<Record<string, string>> => {
  const headers = { ...base };
  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};
