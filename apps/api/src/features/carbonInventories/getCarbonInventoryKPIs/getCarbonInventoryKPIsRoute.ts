import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryKPIsHandler } from "./getCarbonInventoryKPIsHandler.js";
import {
  GetCarbonInventoryKPIsQuerySchema,
  GetCarbonInventoryKPIsResponseSchema,
} from "@repo/types";

export const getCarbonInventoryKPIsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/kpis",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get carbon inventory KPIs",
        description:
          'Get aggregated emissions KPIs (total and by category) from VERIFIED carbon inventories. Filter by year using query parameter (e.g., ?year=2024 or ?year=all)',
        querystring: GetCarbonInventoryKPIsQuerySchema,
        response: {
          200: GetCarbonInventoryKPIsResponseSchema,
        },
      },
    },
    getCarbonInventoryKPIsHandler
  );
};
