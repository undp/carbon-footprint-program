import createError from "@fastify/error";

/**
 * A chatbot turn refused because a token budget is exhausted.
 *
 * 429 rather than 413: the endpoint already returns 413 for a single message
 * that is too large, and the two are different conditions with different
 * remedies — trim the message, versus wait or sign in. Collapsing them would
 * make the widget's copy wrong for one of the two cases and make the logs
 * unreadable for both.
 *
 * The message is supplied by the caller rather than fixed here, because the
 * three quota layers each have their own remedy to name.
 */
export const QuotaExceededError = createError("QUOTA_EXCEEDED", "%s", 429);
