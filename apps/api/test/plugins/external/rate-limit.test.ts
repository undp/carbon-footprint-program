import { describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import rateLimitPlugin, {
  autoConfig,
  toRateLimitKey,
} from "@/plugins/external/rate-limit.js";

// The rate limiter buckets by `request.ip`, and `request.ip` is only the real
// caller when Fastify's `trustProxy` is configured for the topology. That
// coupling is invisible at the call site — the failure mode is a rate limit
// that silently applies to everyone at once rather than per client — so it is
// pinned down here.
//
// These build a bare Fastify app rather than going through `createApp`: the
// behaviour under test is the plugin plus one constructor option, and a bare
// app lets each case pick its own `trustProxy` without a database, a
// testcontainer, or the autoloaded plugin stack.

/** Requests all arrive from this address — the proxy's, in a real topology. */
const PROXY_ADDRESS = "10.0.0.1";

/**
 * Build an app with the real plugin, overriding only `max` so a case can hit
 * the limit in a couple of requests instead of a hundred. The keyGenerator
 * under test comes from `autoConfig` untouched.
 */
const buildApp = async (
  trustProxy: boolean | number | string,
  max: number
): Promise<FastifyInstance> => {
  const app = Fastify({ trustProxy });
  await app.register(rateLimitPlugin, { ...autoConfig, max });
  app.get("/probe", () => ({ ok: true }));
  await app.ready();
  return app;
};

/** One request, arriving at the proxy's socket, claiming `forwardedFor`. */
const probe = (app: FastifyInstance, forwardedFor: string) =>
  app.inject({
    method: "GET",
    url: "/probe",
    remoteAddress: PROXY_ADDRESS,
    headers: { "x-forwarded-for": forwardedFor },
  });

describe("rate-limit autoConfig", () => {
  it("keys the limit on request.ip", () => {
    // Explicit in the source rather than inherited from the library default,
    // so that the dependency on trustProxy is greppable. Assert the wiring
    // rather than trusting the comment.
    const request = { ip: "203.0.113.9" } as unknown as FastifyRequest;
    expect(autoConfig.keyGenerator).toBeTypeOf("function");
    expect(autoConfig.keyGenerator?.(request)).toBe("203.0.113.9");
  });

  it("drops the port so one caller cannot span many buckets", () => {
    // The Azure App Service shape. Two requests from one client differ only by
    // ephemeral port; without this they would be two buckets, i.e. no limit.
    const first = { ip: "203.0.113.9:51234" } as unknown as FastifyRequest;
    const second = { ip: "203.0.113.9:51235" } as unknown as FastifyRequest;
    expect(autoConfig.keyGenerator?.(first)).toBe("203.0.113.9");
    expect(autoConfig.keyGenerator?.(second)).toBe(
      autoConfig.keyGenerator?.(first)
    );
  });

  it("ships the documented 100 req/min production limit", () => {
    expect(autoConfig.max).toBe(100);
    expect(autoConfig.timeWindow).toBe("1 minute");
  });
});

describe("toRateLimitKey", () => {
  it("strips a port from an IPv4 address", () => {
    expect(toRateLimitKey("203.0.113.9:51234")).toBe("203.0.113.9");
    expect(toRateLimitKey("10.0.0.1:80")).toBe("10.0.0.1");
  });

  it("leaves a bare address untouched", () => {
    expect(toRateLimitKey("203.0.113.9")).toBe("203.0.113.9");
  });

  it("does not mistake IPv6 colons for a port separator", () => {
    // The failure this guards: naively splitting on ":" would truncate every
    // IPv6 address to "2001", collapsing unrelated callers into one bucket.
    expect(toRateLimitKey("2001:db8::1")).toBe("2001:db8::1");
    expect(toRateLimitKey("::1")).toBe("::1");
    expect(toRateLimitKey("::ffff:203.0.113.9")).toBe("::ffff:203.0.113.9");
  });

  it("unwraps the bracketed IPv6 forms", () => {
    expect(toRateLimitKey("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(toRateLimitKey("[2001:db8::1]")).toBe("2001:db8::1");
  });
});

describe("rate-limit bucketing — trustProxy off (the default)", () => {
  it("puts every caller behind a proxy into ONE shared bucket", async () => {
    // The regression this whole change exists for. Two distinct clients reach
    // the API through the same proxy; with trustProxy off, both resolve to the
    // proxy's address, so the second client is throttled by the first client's
    // traffic — having sent one request against a limit of two.
    const app = await buildApp(false, 2);
    try {
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);

      const otherClient = await probe(app, "198.51.100.7");
      expect(otherClient.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("ignores a forged X-Forwarded-For instead of minting a fresh bucket", async () => {
    // The flip side, and why the default is `false`: a caller rotating the
    // header must not escape the limit. Every request is keyed on the socket
    // address regardless of what the header claims.
    const app = await buildApp(false, 2);
    try {
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.2")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.3")).statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});

describe("rate-limit bucketing — trustProxy configured", () => {
  it("gives each forwarded client its own bucket", async () => {
    // With the proxy's address trusted, request.ip becomes the client from
    // X-Forwarded-For, so the limit applies per client as intended: the second
    // client gets its own allowance after the first has exhausted its own.
    const app = await buildApp(PROXY_ADDRESS, 2);
    try {
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(429);

      // A different client, unaffected by the first one hitting its limit.
      expect((await probe(app, "198.51.100.7")).statusCode).toBe(200);
      expect((await probe(app, "198.51.100.7")).statusCode).toBe(200);
      expect((await probe(app, "198.51.100.7")).statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("still throttles a single client that rotates nothing", async () => {
    // Guards against the fix over-correcting into no limit at all.
    const app = await buildApp(true, 1);
    try {
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.1")).statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("throttles an Azure App Service client whose port changes per connection", async () => {
    // End-to-end version of the toRateLimitKey cases, in the shape that
    // actually reaches the API on App Service: the platform appends
    // "<client-ip>:<ephemeral-port>" to X-Forwarded-For, and proxy-addr hands
    // it through with the port attached. Keyed naively, each of these three
    // requests is a different caller and the limit never applies.
    const app = await buildApp(PROXY_ADDRESS, 2);
    try {
      expect((await probe(app, "203.0.113.9:51234")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.9:51235")).statusCode).toBe(200);
      expect((await probe(app, "203.0.113.9:51236")).statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});
