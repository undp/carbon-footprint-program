import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllOrganizationMainActivitiesRoute } from "@/features/organizationMainActivities/getAllOrganizationMainActivities/route.js";

export default function organizationMainActivitiesRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(fastify, [getAllOrganizationMainActivitiesRoute]);
}
