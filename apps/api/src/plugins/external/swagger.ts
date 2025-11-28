import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import { FastifyDynamicSwaggerOptions } from "@fastify/swagger";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

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
  transform: jsonSchemaTransform,
};

export default fp<FastifyDynamicSwaggerOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifySwagger, opts);
  },
  { name: "swagger-plugin" }
);
