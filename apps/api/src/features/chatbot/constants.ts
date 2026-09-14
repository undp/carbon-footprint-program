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
