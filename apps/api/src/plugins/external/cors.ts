import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";
import { ALLOWED_ORIGIN } from "@/config/environment.js";

export const autoConfig: FastifyCorsOptions = {
  // In production ALLOWED_ORIGIN is guaranteed set (parseEnv fails closed at
  // boot otherwise), so the `|| true` wildcard fallback only ever applies in
  // dev/test where reflecting any origin is acceptable.
  origin: ALLOWED_ORIGIN || true,
  credentials: !!ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
};

export default fp<FastifyCorsOptions>(
  async (fastify, opts) => {
    await fastify.register(cors, opts);
  },
  { name: "cors-plugin" }
);
