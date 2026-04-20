import type { FastifyZodInstance } from "@/types/fastify.js";
import { getTransparencyDataRoute } from "@/features/transparency/getTransparencyData/route.js";

export default function transparencyRoutes(fastify: FastifyZodInstance) {
  getTransparencyDataRoute(fastify);
}
