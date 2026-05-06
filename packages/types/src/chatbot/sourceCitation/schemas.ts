import { z } from "zod";

const SOURCE_CITATION_SNIPPET_MAX_LENGTH = 240;

const stringOrBigInt = z.union([z.string().min(1), z.bigint(), z.number()]);

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
 * `source_id` and `chunk_id` accept both string (wire-shape, BigInt-as-string)
 * and bigint (server-side). Consumers can coerce as needed.
 */
export const SourceCitationSchema = z.object({
  source_id: stringOrBigInt,
  chunk_id: stringOrBigInt,
  cite_label: z.string().trim().min(1),
  cite_url: httpsUrl,
  snippet: z.string().max(SOURCE_CITATION_SNIPPET_MAX_LENGTH),
});
