import { IS_CHATBOT_ENABLED } from "../config/environment";

/**
 * Vertical stack for the dev-only floating overlays in the bottom-right corner.
 *
 * That corner is shared with ChatbotWidget's FAB, which is app code and owns the
 * base slot. The dev overlays stack above it. bottom-left is not available — the
 * sidebar and logout button own that corner — so everything queues up on the
 * right and the offsets have to be derived rather than guessed.
 *
 *   FORM_DEBUG_BOTTOM_PX        FormDebugPanel toggle
 *   DEVTOOLS_TRIGGER_BOTTOM_PX  TanStack Devtools trigger
 *   GAP_PX                      ChatbotWidget FAB (app code, not ours to move)
 *
 * When the chatbot is disabled for a deployment its FAB is never mounted, so the
 * stack drops down to the corner instead of floating above an empty slot.
 */
const GAP_PX = 16;
const CHATBOT_FAB_HEIGHT_PX = 56;
const DEVTOOLS_TRIGGER_HEIGHT_PX = 40;

/** Shared right edge, matching ChatbotWidget's `right: 16` so the column aligns. */
export const OVERLAY_RIGHT_PX = GAP_PX;

/** First slot above the chatbot FAB, or the corner itself when it is disabled. */
export const DEVTOOLS_TRIGGER_BOTTOM_PX = IS_CHATBOT_ENABLED
  ? GAP_PX + CHATBOT_FAB_HEIGHT_PX + GAP_PX
  : GAP_PX;

/** Second slot, clearing the devtools trigger above it. */
export const FORM_DEBUG_BOTTOM_PX =
  DEVTOOLS_TRIGGER_BOTTOM_PX + DEVTOOLS_TRIGGER_HEIGHT_PX + GAP_PX;
