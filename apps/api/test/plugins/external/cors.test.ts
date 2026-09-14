import { describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import corsPlugin, { autoConfig } from "@/plugins/external/cors.js";

// The rate-limit headers are not CORS-safelisted, so a cross-origin caller can
// only read them when the server names them in Access-Control-Expose-Headers.
// The failure mode is silent and browser-only: the headers arrive on the wire
// (curl sees them) but `response.headers.get(...)` reads null in the page, so
// the chatbot widget falls back to "wait a moment" instead of naming the
// seconds. Nothing in a same-origin test would catch it.

const ORIGIN = "https://example.test";

const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify();
  await app.register(corsPlugin, autoConfig);
  app.get("/probe", () => ({ ok: true }));
  await app.ready();
  return app;
};

describe("cors plugin — exposed headers", () => {
  it("exposes the rate-limit headers to cross-origin callers", async () => {
    const app = await buildApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/probe",
        headers: { origin: ORIGIN },
      });

      const exposed = String(
        response.headers["access-control-expose-headers"] ?? ""
      ).toLowerCase();

      expect(exposed).toContain("x-ratelimit-reset");
      expect(exposed).toContain("x-ratelimit-limit");
      expect(exposed).toContain("x-ratelimit-remaining");
      expect(exposed).toContain("retry-after");
    } finally {
      await app.close();
    }
  });
});
