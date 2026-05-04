import type { FastifyZodInstance } from "@/types/fastify.js";
import { createUserRoute } from "@/features/users/createUser/route.js";
import { getAllUsersRoute } from "@/features/users/getAllUsers/route.js";
import { getUserByIdRoute } from "@/features/users/getUserById/route.js";
import { updateMyProfileRoute } from "@/features/users/updateMyProfile/route.js";
import { updateUserRoleRoute } from "@/features/users/updateUserRole/route.js";
import { deleteUserRoute } from "@/features/users/deleteUser/route.js";
import { getMeRoute } from "@/features/users/getMe/route.js";
import { getUserRoleHistoryRoute } from "@/features/users/getUserRoleHistory/route.js";

export default function usersRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  createUserRoute(fastify);
  getAllUsersRoute(fastify);
  getUserByIdRoute(fastify);
  updateMyProfileRoute(fastify);
  updateUserRoleRoute(fastify);
  deleteUserRoute(fastify);
  getMeRoute(fastify);
  getUserRoleHistoryRoute(fastify);
}
