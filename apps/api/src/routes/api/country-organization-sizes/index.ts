import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountryOrganizationSizesRoute } from "@/features/countryOrganizationSizes/getAllCountryOrganizationSizes/getAllCountryOrganizationSizesRoute.js";

export default function countryOrganizationSizesRoutes(
  fastify: FastifyZodInstance
) {
  getAllCountryOrganizationSizesRoute(fastify);
}
