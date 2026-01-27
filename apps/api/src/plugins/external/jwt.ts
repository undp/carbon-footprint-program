/**
 * @fileoverview Fastify JWT Plugin
 *
 * Registers @fastify/jwt with configuration from the auth module.
 * This provides request.jwtVerify() used by JwksAuthProvider.
 *
 * @see auth/providers/jwksConfig.ts - JWKS configuration
 * @see auth/providers/JwksAuthProvider.ts - Uses request.jwtVerify()
 */

import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyJWTOptions } from "@fastify/jwt";
import { jwtConfig } from "@/auth/providers/jwksConfig.js";

/**
 * Auto-configuration exported for fastify-autoload.
 */
export const autoConfig: FastifyJWTOptions = jwtConfig;

export default fp<FastifyJWTOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifyJwt, opts);
  },
  { name: "jwt-plugin" }
);
