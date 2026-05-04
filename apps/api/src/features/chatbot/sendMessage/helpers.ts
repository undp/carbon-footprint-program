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
  // The chatbot identity preHandler writes the anonymous session cookie
  // directly into Fastify's header store via reply.header("Set-Cookie", ...)
  // (see refreshSessionCookie in features/chatbot/helpers/identity.ts).
  // Forward it onto reply.raw.writeHead() — once we hijack, Fastify no
  // longer serializes its accumulated headers itself, so omitting this would
  // make every anonymous turn mint a brand-new sessionId.
  const setCookie = reply.getHeader("set-cookie");
  const headers: Record<string, string | string[] | number> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  };
  if (setCookie !== undefined) {
    headers["Set-Cookie"] = setCookie as string | string[];
  }
  reply.raw.writeHead(200, headers);
};
