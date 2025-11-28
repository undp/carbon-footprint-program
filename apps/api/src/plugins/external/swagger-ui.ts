import fp from "fastify-plugin";
import fastifySwaggerUi, { FastifySwaggerUiOptions } from "@fastify/swagger-ui";

export const autoConfig: FastifySwaggerUiOptions = {
  routePrefix: "/api/docs",
};

export default fp<FastifySwaggerUiOptions>(
  async function (fastify, opts) {
    await fastify.register(fastifySwaggerUi, opts);
  },
  {
    name: "swagger-ui-plugin",
    dependencies: ["swagger-plugin"],
  }
);
