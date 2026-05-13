import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getSystemParametersRoute } from "@/features/systemParameters/getSystemParameters/route.js";

export default function systemParametersRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getSystemParametersRoute]);
}
