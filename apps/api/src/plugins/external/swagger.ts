import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

export const autoConfig: FastifyDynamicSwaggerOptions = {
  mode: "dynamic",
  openapi: {
    info: {
      title: "Huella Latam API",
      description: "API server for Huella Latam",
      version: "0.0.0",
    },
  },
  hideUntagged: true,
};

export default fp<FastifyDynamicSwaggerOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifySwagger, opts);
  },
  { name: "swagger-plugin" }
);
