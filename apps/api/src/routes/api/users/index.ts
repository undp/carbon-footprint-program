import type { FastifyZodInstance } from "@/types/fastify.js";
import { createUserRoute } from "@/features/users/createUser/createUserRoute.js";
import { getAllUsersRoute } from "@/features/users/getAllUsers/getAllUsersRoute.js";
import { getUserByIdRoute } from "@/features/users/getUserById/getUserByIdRoute.js";
import { updateUserRoute } from "@/features/users/updateUser/updateUserRoute.js";
import { deleteUserRoute } from "@/features/users/deleteUser/deleteUserRoute.js";

export default function usersRoutes(fastify: FastifyZodInstance) {
  createUserRoute(fastify);
  getAllUsersRoute(fastify);
  getUserByIdRoute(fastify);
  updateUserRoute(fastify);
  deleteUserRoute(fastify);
}
