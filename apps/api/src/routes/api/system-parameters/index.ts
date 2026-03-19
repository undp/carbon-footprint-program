import type { FastifyZodInstance } from "@/types/fastify.js";
import { getSystemParametersRoute } from "@/features/systemParameters/getSystemParameters/route.js";

export default function systemParametersRoutes(fastify: FastifyZodInstance) {
  getSystemParametersRoute(fastify);
}
