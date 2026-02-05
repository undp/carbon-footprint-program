import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllJobPositionsRoute } from "@/features/jobPositions/getAllJobPositions/route.js";

export default function jobPositionsRoutes(fastify: FastifyZodInstance) {
  getAllJobPositionsRoute(fastify);
}
