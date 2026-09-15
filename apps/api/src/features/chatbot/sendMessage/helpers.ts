import type { FastifyReply } from "fastify";

/**
 * Write a single SSE event with optional named event, optional id, and a JSON
 * `data:` payload. Always terminates with a blank line per the SSE spec.
 */
export const writeSseEvent = (
  reply: FastifyReply,
  event: string | undefined,
  data: unknown,
  options?: { id?: string }
): void => {
  const lines: string[] = [];
  if (options?.id) lines.push(`id: ${options.id}`);
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  lines.push("", "");
  reply.raw.write(lines.join("\n"));
};

// Recomputed by the stream, so whatever the pipeline accumulated is wrong:
// `content-length` describes a body that is not being sent, and `content-type`
// is overridden below.
const DROPPED_ON_HIJACK = new Set(["content-length", "content-type"]);

/**
 * Send the response head for a hijacked SSE stream.
 *
 * Carries over every header Fastify has already accumulated on the reply.
 * After `reply.hijack()` its onSend hook no longer serializes them, so
 * anything set earlier — by a plugin or by the handler — is silently dropped
 * unless it is forwarded here. Two have bitten already:
 *
 * - `Set-Cookie`, written by the chatbot identity preHandler for anonymous
 *   callers. Losing it minted a brand-new sessionId on every turn.
 * - `Access-Control-Expose-Headers`, written by @fastify/cors. Losing it left
 *   the browser holding `x-conversation-id` but hiding it from the page, so
 *   the widget never learned which conversation its turn had landed in and a
 *   reload rehydrated nothing. The header was on the wire the whole time,
 *   which is what made it hard to see.
 *
 * Forwarding the accumulated set wholesale rather than naming headers one at a
 * time is the point: the next plugin to set a response header on this route
 * should not have to discover this function to work.
 */
export const writeSseHeaders = (reply: FastifyReply): void => {
  const headers: Record<string, string | string[] | number> = {};
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    if (value === undefined) continue;
    if (DROPPED_ON_HIJACK.has(name.toLowerCase())) continue;
    headers[name] = value;
  }
  reply.raw.writeHead(200, {
    ...headers,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
};
