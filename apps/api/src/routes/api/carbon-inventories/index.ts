import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesRoute } from "@/features/carbonInventories/getAllCarbonInventories/getAllCarbonInventoriesRoute.js";
import { getCarbonInventoryByIdRoute } from "@/features/carbonInventories/getCarbonInventoryById/getCarbonInventoryByIdRoute.js";
import { createCarbonInventoryRoute } from "@/features/carbonInventories/createCarbonInventory/createCarbonInventoryRoute.js";
import { updateCarbonInventoryRoute } from "@/features/carbonInventories/updateCarbonInventory/updateCarbonInventoryRoute.js";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  getAllCarbonInventoriesRoute(fastify);
  getCarbonInventoryByIdRoute(fastify);
  createCarbonInventoryRoute(fastify);
  updateCarbonInventoryRoute(fastify);
}
