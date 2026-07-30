import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";

/**
 * Reduce an address to the bare IP, dropping any `:port` suffix.
 *
 * Needed because a forwarded address is not always a bare IP. **Azure App
 * Service appends the client's IP _and_ ephemeral port** to `X-Forwarded-For`
 * (`203.0.113.9:51234`), and proxy-addr passes that through verbatim — so with
 * `TRUST_PROXY` set, `request.ip` carries the port. Bucketing on that would
 * give every TCP connection from one caller its own key, which does not merely
 * fail to fix the shared-bucket problem: it removes the rate limit altogether,
 * silently. Verified against this Fastify/proxy-addr version; see the tests.
 *
 * IPv6 is left intact — a bare address is full of colons, and the bracketed
 * form carries its own port syntax.
 */
export const toRateLimitKey = (ip: string): string => {
  // Bracketed IPv6, with or without a port: [2001:db8::1]:443 → 2001:db8::1
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(ip);
  if (bracketed) return bracketed[1];

  // Exactly one colon means IPv4 (or a hostname) plus a port. A bare IPv6
  // address always has more than one, so this leaves those alone.
  const colon = ip.indexOf(":");
  if (colon !== -1 && colon === ip.lastIndexOf(":")) return ip.slice(0, colon);

  return ip;
};

// `RateLimitPluginOptions`, not `FastifyRateLimitOptions`. The latter is an
// EMPTY interface the package exposes purely as a declaration-merging hook for
// custom stores, so annotating with it types this object as `{}` — every key
// below goes unchecked, and a typo or a wrong-shaped keyGenerator compiles
// silently. That is not hypothetical: it is why the bucket key went unexamined
// long enough to ship a shared-bucket rate limit behind a proxy.
export const autoConfig: RateLimitPluginOptions = {
  max: 100,
  timeWindow: "1 minute",
  // The bucket key is the entire security property of this plugin, so it is
  // written out rather than inherited from the library default. It is only as
  // good as `request.ip`, which reflects X-Forwarded-For only when TRUST_PROXY
  // is configured (config/environment.ts): behind a proxy with TRUST_PROXY
  // unset, every caller resolves to the proxy's address and shares ONE bucket.
  // The normalization is what keeps the configured case from failing the other
  // way — see toRateLimitKey.
  keyGenerator: (request: FastifyRequest) => toRateLimitKey(request.ip),
};

export default fp<RateLimitPluginOptions>(
  async (fastify, opts) => {
    await fastify.register(fastifyRateLimit, opts);
  },
  { name: "rate-limit-plugin" }
);
