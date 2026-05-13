import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getTransparencyDataRoute } from "@/features/transparency/getTransparencyData/route.js";

export default function transparencyRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getTransparencyDataRoute]);
}
