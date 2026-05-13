import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getOrganizationFormFieldsRoute } from "@/features/forms/organizations/route.js";

/**
 * Routes for /api/forms
 */
export default function formsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getOrganizationFormFieldsRoute], {
    defaultSystemRoles: [
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ],
  });
}
