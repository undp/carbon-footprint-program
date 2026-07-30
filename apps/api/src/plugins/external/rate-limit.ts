import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import type { RateLimitPluginOptions } from "@fastify/rate-limit";

// `RateLimitPluginOptions`, not `FastifyRateLimitOptions`. The latter is an
// EMPTY interface the package exposes purely as a declaration-merging hook for
// custom stores, so annotating with it types this object as `{}` — every key
// below goes unchecked, and a typo or a wrong-shaped keyGenerator compiles
// silently. That is not hypothetical: it is why the bucket key went unexamined
// long enough to ship a shared-bucket rate limit behind a proxy.
export const autoConfig: RateLimitPluginOptions = {
  max: 100,
  timeWindow: "1 minute",
  // Spelled out even though it matches @fastify/rate-limit's own default. The
  // bucket key is the entire security property of this plugin, and leaving it
  // implicit is how it went unnoticed that the limit is only as good as
  // `request.ip` — which reflects X-Forwarded-For only when TRUST_PROXY is
  // configured (config/environment.ts). Behind a proxy with TRUST_PROXY unset,
  // every caller resolves to the proxy's address and shares ONE bucket; this
  // line is where to look when that behaviour needs explaining.
  keyGenerator: (request: FastifyRequest) => request.ip,
};

export default fp<RateLimitPluginOptions>(
  async (fastify, opts) => {
    await fastify.register(fastifyRateLimit, opts);
  },
  { name: "rate-limit-plugin" }
);
