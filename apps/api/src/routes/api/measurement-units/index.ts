import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMeasurementUnitsRoute } from "@/features/measurementUnits/getAllMeasurementUnits/route.js";
import { getAllRateMeasurementUnitsRoute } from "@/features/measurementUnits/getAllRateMeasurementUnits/route.js";

export default function measurementUnitsRoutes(fastify: FastifyZodInstance) {
  getAllMeasurementUnitsRoute(fastify);
  getAllRateMeasurementUnitsRoute(fastify);
}
