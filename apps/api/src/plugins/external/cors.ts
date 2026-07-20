import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";
import { IS_PROD } from "@/config/environment.js";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

// Fail closed in production. Without an explicit ALLOWED_ORIGIN the fallback
// below reflects ANY origin (`origin: true`) with credentials disabled — a
// cross-origin fail-open that must never happen in a deployed environment.
// Refuse to boot instead, so the misconfiguration surfaces at startup / health
// check rather than as silently open CORS. The permissive fallback is kept
// ONLY for local dev and tests (IS_PROD === false).
if (IS_PROD && !ALLOWED_ORIGIN) {
  throw new Error(
    "ALLOWED_ORIGIN is required when NODE_ENV=production. Refusing to start: " +
      "without it CORS would reflect any origin (origin: true) and accept " +
      "cross-origin requests from anywhere. Set ALLOWED_ORIGIN to the web " +
      "app's exact browser origin (scheme + host + port, no trailing slash)."
  );
}

export const autoConfig: FastifyCorsOptions = {
  // In production ALLOWED_ORIGIN is guaranteed set (the guard above throws
  // otherwise), so the `|| true` wildcard fallback only ever applies in
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
