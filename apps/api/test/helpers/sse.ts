import type { FastifyInstance } from "fastify";

export type ParsedSseEvent = {
  id?: string;
  event?: string;
  data: unknown;
};

class SseTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SseTimeoutError";
  }
}

const parseEventBlock = (block: string): ParsedSseEvent | null => {
  const lines = block.split(/\r?\n/);
  let id: string | undefined;
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("id:")) id = line.slice(3).trim();
    else if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  const rawData = dataLines.join("\n");
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    data = rawData;
  }
  return { id, event, data };
};

export const collectSseEvents = async (
  app: FastifyInstance,
  url: string,
  body: unknown,
  options?: {
    headers?: Record<string, string>;
    cookies?: string;
    timeoutMs?: number;
    method?: string;
    /**
     * When true (default), the helper calls `app.listen({ port: 0 })` and
     * tears it down with `app.close()` in the `finally`. Set to `false` when
     * passing a suite-level app whose lifecycle is managed by the caller —
     * the helper will then assume `app.listen` has already been called.
     */
    ownsApp?: boolean;
  }
): Promise<{
  status: number;
  events: ParsedSseEvent[];
  setCookie: string[];
}> => {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const ownsApp = options?.ownsApp ?? true;
  if (ownsApp) {
    await app.listen({ port: 0, host: "127.0.0.1" });
  }
  const address = app.server.address();
  if (!address || typeof address === "string") {
    if (ownsApp) await app.close();
    throw new Error("Failed to acquire test server address");
  }
  const fullUrl = `http://127.0.0.1:${address.port}${url}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options?.headers ?? {}),
  };
  if (options?.cookies) headers["cookie"] = options.cookies;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: options?.method ?? "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (ownsApp) await app.close();
    if (controller.signal.aborted) {
      throw new SseTimeoutError(`SSE request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }

  const setCookie: string[] = [];
  // Use the raw header (Headers.getSetCookie is available in Node 20+).
  const headersAny = response.headers as unknown as {
    getSetCookie?: () => string[];
  };
  if (typeof headersAny.getSetCookie === "function") {
    setCookie.push(...headersAny.getSetCookie());
  }

  const events: ParsedSseEvent[] = [];

  if (!response.body) {
    clearTimeout(timer);
    if (ownsApp) await app.close();
    return { status: response.status, events, setCookie };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const event = parseEventBlock(block);
        if (event) events.push(event);
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
    clearTimeout(timer);
    if (ownsApp) await app.close();
  }

  return { status: response.status, events, setCookie };
};
