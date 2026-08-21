import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllTerritoriesRoute } from "@/features/territories/getAllTerritories/route.js";

export default function territoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getAllTerritoriesRoute]);
}
