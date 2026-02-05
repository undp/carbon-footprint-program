import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountrySectorsRoute } from "@/features/countrySectors/getAllCountrySectors/route.js";

export default function countrySectorsRoutes(fastify: FastifyZodInstance) {
  getAllCountrySectorsRoute(fastify);
}
