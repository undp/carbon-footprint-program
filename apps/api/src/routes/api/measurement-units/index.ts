import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { getAllMeasurementUnitsRoute } from "@/features/measurementUnits/getAllMeasurementUnits/route.js";
import { getAllRateMeasurementUnitsRoute } from "@/features/measurementUnits/getAllRateMeasurementUnits/route.js";
import { createMeasurementUnitRoute } from "@/features/measurementUnits/createMeasurementUnit/route.js";
import { updateMeasurementUnitRoute } from "@/features/measurementUnits/updateMeasurementUnit/route.js";
import { deleteMeasurementUnitRoute } from "@/features/measurementUnits/deleteMeasurementUnit/route.js";

export default function measurementUnitsRoutes(fastify: FastifyZodInstance) {
  getAllMeasurementUnitsRoute(fastify);
  getAllRateMeasurementUnitsRoute(fastify);

  fastify.register((f) => {
    f.addHook("onRequest", f.requireAuth);
    f.addHook(
      "preHandler",
      f.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
    );
    createMeasurementUnitRoute(f);
    updateMeasurementUnitRoute(f);
    deleteMeasurementUnitRoute(f);
  });
}
