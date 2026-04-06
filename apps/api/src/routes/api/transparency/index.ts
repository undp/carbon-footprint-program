import type { FastifyZodInstance } from "@/types/fastify.js";
import { getTransparencyDataRoute } from "@/features/transparency/getTransparencyData/getTransparencyDataRoute.js";

export default function transparencyRoutes(fastify: FastifyZodInstance) {
  getTransparencyDataRoute(fastify);
}
