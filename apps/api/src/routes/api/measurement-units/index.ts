import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMeasurementUnitsRoute } from "@/features/measurementUnits/getAllMeasurementUnits/getAllMeasurementUnitsRoute.js";
import { getAllRateMeasurementUnitsRoute } from "@/features/measurementUnits/getAllRateMeasurementUnits/getAllRateMeasurementUnitsRoute.js";

export default function measurementUnitsRoutes(fastify: FastifyZodInstance) {
  getAllMeasurementUnitsRoute(fastify);
  getAllRateMeasurementUnitsRoute(fastify);
}
