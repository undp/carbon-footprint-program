import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllCountrySectorsRoute } from "@/features/countrySectors/getAllCountrySectors/route.js";

export default function countrySectorsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getAllCountrySectorsRoute]);
}
