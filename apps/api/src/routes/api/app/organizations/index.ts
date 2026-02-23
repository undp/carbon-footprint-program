import type { FastifyZodInstance } from "@/types/fastify.js";
import { addOrganizationUserRoute } from "@/features/organizations/app/addOrganizationUser/route.js";
import { getOrganizationUsersRoute } from "@/features/organizations/app/getOrganizationUsers/route.js";
import { updateOrganizationUserRoleRoute } from "@/features/organizations/app/updateOrganizationUserRole/route.js";
import { removeOrganizationUserRoute } from "@/features/organizations/app/removeOrganizationUser/route.js";

export default function appOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  addOrganizationUserRoute(fastify);
  getOrganizationUsersRoute(fastify);
  updateOrganizationUserRoleRoute(fastify);
  removeOrganizationUserRoute(fastify);
}
