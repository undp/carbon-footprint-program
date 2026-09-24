// The widget's pointer to the thread it is showing.
//
// This used to be the server's `chatbot_conversation_id` cookie, read and
// cleared through `document.cookie`. That only works when the API shares the
// page's origin, and it does not: the front end is a Static Web App and the API
// has its own App Service domain (the cross-site requirement is stated in the
// chatbot-conversation-persistence spec). "Nueva conversación" was therefore
// writing and deleting a cookie of the page's own origin that nobody sent,
// while the browser kept attaching the real one — so the server never left the
// old thread. Owning the id here makes clearing it a local operation that
// cannot silently fail, and it is also what lets the two intents "continue" and
// "start fresh" be told apart on the wire.
//
// localStorage rather than sessionStorage: the previous cookie carried a 30-day
// Max-Age and survived closing the browser, and dropping to per-tab lifetime
// would be a regression. It is per-browser and per-device either way — resuming
// a thread from another device is an identity question, not a storage one, and
// is not solved here.
const STORAGE_KEY = "chatbot_conversation_id";

// Fallback for the turns where localStorage is unavailable: Safari's private
// mode throws on write, and a browser with site data blocked throws on read.
// Holding the id in module scope keeps a single page session coherent instead
// of opening a new conversation on every message; it is lost on reload, which
// is the same outcome as having no storage at all.
let inMemoryId: string | null = null;

export const readConversationId = (): string | null => {
  if (inMemoryId !== null) return inMemoryId;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const writeConversationId = (conversationId: string): void => {
  inMemoryId = conversationId;
  try {
    window.localStorage.setItem(STORAGE_KEY, conversationId);
  } catch {
    // Storage blocked — `inMemoryId` carries this page session on its own.
  }
};

/**
 * Forget the current thread so the next turn opens a new one and a reload
 * rehydrates nothing. The persisted rows stay intact — this detaches the
 * client from the conversation, it does not delete history.
 */
export const clearConversationId = (): void => {
  inMemoryId = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove if storage was never reachable.
  }
};
