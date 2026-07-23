import fp from "fastify-plugin";
import helmet, { FastifyHelmetOptions } from "@fastify/helmet";

export const autoConfig: FastifyHelmetOptions = {
  // This is a JSON API, so helmet's secure header defaults (HSTS,
  // X-Frame-Options, X-Content-Type-Options: nosniff, Referrer-Policy, the
  // Cross-Origin-* policies, etc.) are exactly what we want and are left as-is.
  //
  // CSP is the one default we disable: the only HTML surface is the Swagger UI
  // at /api/docs, whose inline bootstrap script/styles helmet's default
  // `script-src 'self'` (plus `upgrade-insecure-requests`) would block, and a
  // Content-Security-Policy adds little value for JSON responses that are never
  // rendered as a document. See docs/security/hardening.md.
  contentSecurityPolicy: false,
};

export default fp<FastifyHelmetOptions>(
  async (fastify, opts) => {
    await fastify.register(helmet, opts);
  },
  { name: "helmet-plugin" }
);
