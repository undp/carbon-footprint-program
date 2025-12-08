import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMeasurementUnitsRoute } from "@/features/measurementUnits/getAllMeasurementUnits/getAllMeasurementUnitsRoute.js";

export default function measurementUnitsRoutes(fastify: FastifyZodInstance) {
  getAllMeasurementUnitsRoute(fastify);
}
