import type { FastifyZodInstance } from "@/types/fastify.js";

export default function apiRoutes(fastify: FastifyZodInstance) {
  fastify.get("/", () => ({
    message: "API lista",
  }));
}
