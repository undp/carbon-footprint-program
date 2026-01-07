import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesRoute } from "@/features/carbonInventories/getAllCarbonInventories/getAllCarbonInventoriesRoute.js";
import { getCarbonInventoryByIdRoute } from "@/features/carbonInventories/getCarbonInventoryById/getCarbonInventoryByIdRoute.js";
import { createCarbonInventoryRoute } from "@/features/carbonInventories/createCarbonInventory/createCarbonInventoryRoute.js";
import { updateCarbonInventoryRoute } from "@/features/carbonInventories/updateCarbonInventory/updateCarbonInventoryRoute.js";
import { getCarbonInventoryMethodologyRoute } from "@/features/carbonInventories/getCarbonInventoryMethodology/getCarbonInventoryMethodologyRoute.js";
import { getCarbonInventorySubcategoriesSummaryRoute } from "@/features/carbonInventories/getCarbonInventorySubcategoriesSummary/getCarbonInventorySubcategoriesSummaryRoute.js";
import { createCarbonInventoryLineRoute } from "@/features/carbonInventories/createCarbonInventoryLine/createCarbonInventoryLineRoute.js";
import { deleteCarbonInventoryLineRoute } from "@/features/carbonInventories/deleteCarbonInventoryLine/deleteCarbonInventoryLineRoute.js";
import { addSubcategoriesToCarbonInventoryRoute } from "@/features/carbonInventories/addSubcategoriesToCarbonInventory/addSubcategoriesToCarbonInventoryRoute.js";
import { updateCarbonInventoryLinesRoute } from "@/features/carbonInventories/updateCarbonInventoryLines/updateCarbonInventoryLinesRoute.js";
import { updateCarbonInventorySubcategoriesRoute } from "@/features/carbonInventories/updateCarbonInventorySubcategories/updateCarbonInventorySubcategoriesRoute.js";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  getAllCarbonInventoriesRoute(fastify);
  getCarbonInventoryByIdRoute(fastify);
  createCarbonInventoryRoute(fastify);
  updateCarbonInventoryRoute(fastify);
  getCarbonInventoryMethodologyRoute(fastify);
  getCarbonInventorySubcategoriesSummaryRoute(fastify);
  createCarbonInventoryLineRoute(fastify);
  deleteCarbonInventoryLineRoute(fastify);
  addSubcategoriesToCarbonInventoryRoute(fastify);
  updateCarbonInventoryLinesRoute(fastify);
  updateCarbonInventorySubcategoriesRoute(fastify);
}
