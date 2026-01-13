import type { FastifyZodInstance } from "@/types/fastify.js";
import { createUserRoute } from "@/features/users/createUser/createUserRoute.js";

export default function usersRoutes(fastify: FastifyZodInstance) {
  createUserRoute(fastify);
}
