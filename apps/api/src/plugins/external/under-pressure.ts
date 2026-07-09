import fastifyUnderPressure from "@fastify/under-pressure";
import fp from "fastify-plugin";
import { FastifyUnderPressureOptions } from "@fastify/under-pressure";

export const autoConfig: FastifyUnderPressureOptions = {
  maxEventLoopDelay: 300,
  maxHeapUsedBytes: 500 * 1024 * 1024,
  maxRssBytes: 1000 * 1024 * 1024,
  maxEventLoopUtilization: 0.9,
};

export default fp<FastifyUnderPressureOptions>(
  async function (fastify, opts) {
    if (process.env.NODE_ENV === "test") return;
    await fastify.register(fastifyUnderPressure, opts);
  },
  {
    name: "under-pressure-plugin",
  }
);
