import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllTerritoriesRoute } from "@/features/territories/getAllTerritories/route.js";
import { getTerritoryLevelsRoute } from "@/features/territories/getTerritoryLevels/route.js";

export default function territoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getAllTerritoriesRoute, getTerritoryLevelsRoute]);
}
