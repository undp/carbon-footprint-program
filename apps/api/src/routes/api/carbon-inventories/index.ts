import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesRoute } from "@/features/carbonInventories/getAllCarbonInventories/route.js";
import { getCarbonInventoryByIdRoute } from "@/features/carbonInventories/getCarbonInventoryById/route.js";
import { createCarbonInventoryRoute } from "@/features/carbonInventories/createCarbonInventory/route.js";
import { updateCarbonInventoryRoute } from "@/features/carbonInventories/updateCarbonInventory/route.js";
import { getCarbonInventoryMethodologyRoute } from "@/features/carbonInventories/getCarbonInventoryMethodology/route.js";
import { getCarbonInventorySubcategoriesSummaryRoute } from "@/features/carbonInventories/getCarbonInventorySubcategoriesSummary/route.js";
import { addSubcategoriesToCarbonInventoryRoute } from "@/features/carbonInventories/addSubcategoriesToCarbonInventory/route.js";
import { updateCarbonInventorySubcategoriesRoute } from "@/features/carbonInventories/updateCarbonInventorySubcategories/route.js";
import { toggleManualTotalEmissionsRoute } from "@/features/carbonInventories/toggleManualTotalEmissions/route.js";
import { syncCarbonInventoryLinesRoute } from "@/features/carbonInventories/syncCarbonInventoryLines/route.js";
import { getAvailableYearsRoute } from "@/features/carbonInventories/getAvailableYears/route.js";
import { getCarbonInventoryResultsRoute } from "@/features/carbonInventories/getCarbonInventoryResults/route.js";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  getAllCarbonInventoriesRoute(fastify);
  getCarbonInventoryByIdRoute(fastify);
  createCarbonInventoryRoute(fastify);
  updateCarbonInventoryRoute(fastify);
  getCarbonInventoryMethodologyRoute(fastify);
  getCarbonInventorySubcategoriesSummaryRoute(fastify);
  addSubcategoriesToCarbonInventoryRoute(fastify);
  updateCarbonInventorySubcategoriesRoute(fastify);
  toggleManualTotalEmissionsRoute(fastify);
  syncCarbonInventoryLinesRoute(fastify);
  getAvailableYearsRoute(fastify);
  getCarbonInventoryResultsRoute(fastify);
}
