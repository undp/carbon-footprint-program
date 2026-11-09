import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllEmissionFactorsRoute } from "@/features/emissionFactors/getAllEmissionFactors/route.js";
import { createEmissionFactorRoute } from "@/features/emissionFactors/createEmissionFactor/route.js";
import { updateEmissionFactorRoute } from "@/features/emissionFactors/updateEmissionFactor/route.js";
import { deleteEmissionFactorRoute } from "@/features/emissionFactors/deleteEmissionFactor/route.js";
import { duplicateEmissionFactorYearRoute } from "@/features/emissionFactors/duplicateEmissionFactorYear/route.js";
import { SystemRole } from "@repo/types";

export default function emissionFactorsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllEmissionFactorsRoute,
      createEmissionFactorRoute,
      updateEmissionFactorRoute,
      deleteEmissionFactorRoute,
      duplicateEmissionFactorYearRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
