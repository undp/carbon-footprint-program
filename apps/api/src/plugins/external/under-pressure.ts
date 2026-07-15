import fastifyUnderPressure from "@fastify/under-pressure";
import fp from "fastify-plugin";
import { FastifyUnderPressureOptions } from "@fastify/under-pressure";
import {
  MAX_EVENT_LOOP_DELAY_MS,
  MAX_EVENT_LOOP_UTILIZATION,
} from "@/config/environment.js";

// The two event-loop thresholds are env-configurable (MAX_EVENT_LOOP_DELAY_MS /
// MAX_EVENT_LOOP_UTILIZATION) so a deployment or CI runner under unusual load
// can tune them without a code change; defaults preserve production behaviour.
// The heap/RSS limits stay hardcoded — no need to tune them per environment.
export const autoConfig: FastifyUnderPressureOptions = {
  maxEventLoopDelay: MAX_EVENT_LOOP_DELAY_MS,
  maxHeapUsedBytes: 500 * 1024 * 1024,
  maxRssBytes: 1000 * 1024 * 1024,
  maxEventLoopUtilization: MAX_EVENT_LOOP_UTILIZATION,
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
