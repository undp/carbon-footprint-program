import type { FastifyInstance } from "fastify";

export default function apiRoutes(fastify: FastifyInstance) {
  fastify.get("/", () => ({
    message: "API lista",
  }));
}
