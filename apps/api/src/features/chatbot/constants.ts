/**
 * Generic, user-facing Spanish error message returned by the chatbot when an
 * underlying LLM provider fails. Surfaced via HTTP 503 responses (pre-stream)
 * and via the terminal SSE `event: error` payload (mid-stream). The constant
 * is the single source of truth — handlers and tests SHALL import it by name.
 */
export const CHATBOT_GENERIC_ERROR_MESSAGE =
  "El asistente no está disponible en este momento. Por favor intenta nuevamente.";

/**
 * Modo A K=0 opener — byte-for-byte mirror of the literal in `prompts/es/system.md`.
 * Handler and mock import it by name to align persistence and SSE wire with the
 * assistant text when the model emits the opener.
 */
export const CHATBOT_K0_OPENER =
  "No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.";

/**
 * Spanish rejection copy for the three quota layers, in neutral Spanish to
 * match the rest of the chatbot UI.
 *
 * Three messages rather than one because the three refusals have different
 * remedies, and only the third has one the user can act on immediately.
 * Collapsing them into a single generic line hides it: someone told "el
 * asistente no está disponible" retries, while someone told to sign in stops
 * being blocked.
 *
 * The collective message does reveal system state — it confirms to an abuser
 * that the shared pool is exhausted. Accepted: silence would not deter them and
 * does confuse everyone else.
 */
export const CHATBOT_RATE_LIMIT_MESSAGE =
  "Espera unos segundos antes de volver a preguntar.";

export const CHATBOT_IDENTITY_BUDGET_MESSAGE =
  "Alcanzaste tu límite de uso diario. Vuelve mañana.";

export const CHATBOT_SHARED_BUDGET_MESSAGE =
  "El asistente alcanzó su límite de uso diario. Inicia sesión para continuar.";
