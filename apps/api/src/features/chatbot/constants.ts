/**
 * Generic, user-facing Spanish error message returned by the chatbot when an
 * underlying LLM provider fails. Surfaced via HTTP 503 responses (pre-stream)
 * and via the terminal SSE `event: error` payload (mid-stream). The constant
 * is the single source of truth — handlers and tests SHALL import it by name.
 */
export const CHATBOT_GENERIC_ERROR_MESSAGE =
  "El asistente no está disponible en este momento. Por favor intenta nuevamente.";
