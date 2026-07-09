import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllJobPositionsRoute } from "@/features/jobPositions/getAllJobPositions/route.js";

export default function jobPositionsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getAllJobPositionsRoute]);
}
