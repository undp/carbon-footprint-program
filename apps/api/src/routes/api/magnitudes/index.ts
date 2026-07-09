import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllMagnitudesRoute } from "@/features/magnitudes/getAllMagnitudes/route.js";
import { createMagnitudeRoute } from "@/features/magnitudes/createMagnitude/route.js";
import { updateMagnitudeRoute } from "@/features/magnitudes/updateMagnitude/route.js";
import { deleteMagnitudeRoute } from "@/features/magnitudes/deleteMagnitude/route.js";

export default function magnitudesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllMagnitudesRoute,
      createMagnitudeRoute,
      updateMagnitudeRoute,
      deleteMagnitudeRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
