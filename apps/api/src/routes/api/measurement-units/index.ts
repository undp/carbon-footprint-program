import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllMeasurementUnitsRoute } from "@/features/measurementUnits/getAllMeasurementUnits/route.js";
import { getAllRateMeasurementUnitsRoute } from "@/features/measurementUnits/getAllRateMeasurementUnits/route.js";
import { createMeasurementUnitRoute } from "@/features/measurementUnits/createMeasurementUnit/route.js";
import { updateMeasurementUnitRoute } from "@/features/measurementUnits/updateMeasurementUnit/route.js";
import { deleteMeasurementUnitRoute } from "@/features/measurementUnits/deleteMeasurementUnit/route.js";

export default function measurementUnitsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [
    getAllMeasurementUnitsRoute,
    getAllRateMeasurementUnitsRoute,
  ]);

  registerRoutes(
    fastify,
    [
      createMeasurementUnitRoute,
      updateMeasurementUnitRoute,
      deleteMeasurementUnitRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
