import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";
import { FastifyRateLimitOptions } from "@fastify/rate-limit";

export const autoConfig: FastifyRateLimitOptions = {
  max: 100,
  timeWindow: "1 minute",
};

export default fp<FastifyRateLimitOptions>(
  async (fastify, opts) => {
    await fastify.register(fastifyRateLimit, opts);
  },
  { name: "rate-limit-plugin" }
);
