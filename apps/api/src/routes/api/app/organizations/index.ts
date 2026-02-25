import type { FastifyZodInstance } from "@/types/fastify.js";
import { addOrganizationUserRoute } from "@/features/organizations/app/addOrganizationUser/route.js";
import { getOrganizationUsersRoute } from "@/features/organizations/app/getOrganizationUsers/route.js";
import { updateOrganizationUserRoleRoute } from "@/features/organizations/app/updateOrganizationUserRole/route.js";
import { removeOrganizationUserRoute } from "@/features/organizations/app/removeOrganizationUser/route.js";
import { getMyOrganizationsRoute } from "@/features/organizations/app/getMyOrganizationsSelectorOptions/route.js";
import { getOrganizationByIdRoute } from "@/features/organizations/app/getOrganizationById/route.js";
import { createOrganizationRoute } from "@/features/organizations/app/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/organizations/app/updateOrganization/route.js";
import { requestOrganizationAccreditationRoute } from "@/features/organizations/app/requestOrganizationAccreditation/route.js";

export default function appOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);

  addOrganizationUserRoute(fastify);
  getOrganizationUsersRoute(fastify);
  updateOrganizationUserRoleRoute(fastify);
  removeOrganizationUserRoute(fastify);
  getMyOrganizationsRoute(fastify);
  getOrganizationByIdRoute(fastify);
  createOrganizationRoute(fastify);
  updateOrganizationRoute(fastify);
  requestOrganizationAccreditationRoute(fastify);
}
