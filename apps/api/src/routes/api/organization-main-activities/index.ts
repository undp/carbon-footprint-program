import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllOrganizationMainActivitiesRoute } from "@/features/organizationMainActivities/getAllOrganizationMainActivities/route.js";

export default function organizationMainActivitiesRoutes(
  fastify: FastifyZodInstance
) {
  getAllOrganizationMainActivitiesRoute(fastify);
}
