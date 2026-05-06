import { z } from "zod";
import type { SourceCitationSchema } from "./schemas.ts";

/**
 * Server-side citation shape — `source_id`/`chunk_id` may be either string or
 * bigint depending on context (raw retrieval returns BigInts, JSON parsing
 * returns strings).
 */
export type SourceCitation = z.infer<typeof SourceCitationSchema>;

/**
 * Wire-safe citation shape used on the `done` SSE event payload and on the
 * widget side. BigInts are serialized to strings before transport because
 * BigInt is not natively supported by `JSON.stringify`.
 */
export type SourceCitationWire = {
  source_id: string;
  chunk_id: string;
  cite_label: string;
  cite_url: string;
  snippet: string;
};
