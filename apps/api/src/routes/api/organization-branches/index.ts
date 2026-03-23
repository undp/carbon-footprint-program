import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllOrganizationBranchesRoute } from "@/features/organizationBranches/getAllOrganizationBranches/route.js";

export default function organizationBranchesRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getAllOrganizationBranchesRoute(fastify);
}
