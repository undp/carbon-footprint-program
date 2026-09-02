// Client-side mirror of the server cookie written by
// apps/api/src/features/chatbot/helpers/conversationCookie.ts. The server sets
// it with httpOnly=false on purpose so "Nueva conversación" can detach the
// widget from the persisted thread without a server round-trip.
//
// This works because the widget calls the API through relative `/api/...`
// paths, which the Vite dev proxy (and the deployment's edge) keep same-origin
// — a cookie written by a genuinely cross-site API domain would not be
// reachable from `document.cookie` here.
const CONVERSATION_COOKIE_NAME = "chatbot_conversation_id";
const CONVERSATION_COOKIE_PATH = "/api/chatbot";

/**
 * Drop the conversation cookie so a subsequent page load does NOT rehydrate the
 * prior thread. The persisted rows stay intact — this detaches the client from
 * the conversation, it does not delete history.
 */
export const clearConversationCookieClient = (): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${CONVERSATION_COOKIE_NAME}=; path=${CONVERSATION_COOKIE_PATH}; max-age=0; SameSite=Lax`;
};
