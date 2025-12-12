import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountrySectorsRoute } from "@/features/countrySectors/getAllCountrySectors/getAllCountrySectorsRoute.js";

export default function countrySectorsRoutes(fastify: FastifyZodInstance) {
  getAllCountrySectorsRoute(fastify);
}
