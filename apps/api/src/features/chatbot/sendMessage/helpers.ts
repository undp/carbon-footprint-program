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

export const writeSseHeaders = (reply: FastifyReply): void => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
};
