import type { FastifyZodInstance } from "@/types/fastify.js";
import { createUserRoute } from "@/features/users/createUser/createUserRoute.js";
import { getAllUsersRoute } from "@/features/users/getAllUsers/getAllUsersRoute.js";

export default function usersRoutes(fastify: FastifyZodInstance) {
  createUserRoute(fastify);
  getAllUsersRoute(fastify);
}
