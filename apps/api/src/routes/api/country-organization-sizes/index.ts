import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllCountryOrganizationSizesRoute } from "@/features/countryOrganizationSizes/getAllCountryOrganizationSizes/route.js";

export default function countryOrganizationSizesRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(fastify, [getAllCountryOrganizationSizesRoute]);
}
