import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyJWTOptions } from "@fastify/jwt";
import { JWT_SECRET } from "@/config/environment.js";

export const autoConfig: FastifyJWTOptions = {
  secret: JWT_SECRET,
};

export default fp<FastifyJWTOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifyJwt, opts);
  },
  { name: "jwt-plugin" }
);
