import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyJWTOptions } from "@fastify/jwt";

export const autoConfig: FastifyJWTOptions = {
  secret: process.env.JWT_SECRET || "super-secret-key",
};

export default fp<FastifyJWTOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifyJwt, opts);
  },
  { name: "jwt-plugin" }
);
