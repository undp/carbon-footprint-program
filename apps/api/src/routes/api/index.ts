import type { FastifyZodInstance } from "@/types/fastify.js";

export type StandardRouteSignature = (
  fastify: FastifyZodInstance,
  options?: { public?: boolean; allowAnonymousAccess?: boolean }
) => void;

export default function apiRoutes(fastify: FastifyZodInstance) {
  fastify.get("/", () => ({
    message: "API lista",
  }));
}
