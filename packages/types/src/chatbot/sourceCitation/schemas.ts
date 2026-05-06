import { z } from "zod";
import { IdSchema } from "../../zod.js";

const SOURCE_CITATION_SNIPPET_MAX_LENGTH = 240;

// Identifier branch: numeric-string IDs reuse the repo-wide IdSchema regex
// (/^\d+$/). The bigint branch is constrained to positive values so decimals,
// negatives, NaN, and Infinity cannot smuggle past the union.
const positiveBigInt = z.bigint().refine((value) => value > 0n, {
  message: "ID must be a positive bigint.",
});
const sourceIdField = z.union([IdSchema, positiveBigInt]);

const httpsUrl = z
  .string()
  .url()
  .refine((value) => /^https:\/\//i.test(value), {
    message: "cite_url must use the https protocol.",
  });

/**
 * Citation for a single corpus chunk used in an assistant turn. Persisted as
 * JSONB on chatbot_chat_message.sources_cited and emitted as the optional
 * `sources` field on the `done` SSE event payload.
 *
 * `source_id` and `chunk_id` accept either a numeric-string id (wire-shape,
 * BigInt-as-string) or a positive bigint (server-side). Decimals, negatives,
 * NaN, Infinity, or otherwise non-identifier numbers are rejected.
 */
export const SourceCitationSchema = z.object({
  source_id: sourceIdField,
  chunk_id: sourceIdField,
  cite_label: z.string().trim().min(1),
  cite_url: httpsUrl,
  snippet: z.string().max(SOURCE_CITATION_SNIPPET_MAX_LENGTH),
});
