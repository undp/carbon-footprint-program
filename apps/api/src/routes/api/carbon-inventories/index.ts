import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCarbonInventoriesRoute } from "@/features/carbonInventories/getAllCarbonInventories/route.js";
import { getCarbonInventoryByIdRoute } from "@/features/carbonInventories/getCarbonInventoryById/route.js";
import { createCarbonInventoryRoute } from "@/features/carbonInventories/createCarbonInventory/route.js";
import { updateCarbonInventoryRoute } from "@/features/carbonInventories/updateCarbonInventory/route.js";
import { getCarbonInventoryMethodologyRoute } from "@/features/carbonInventories/getCarbonInventoryMethodology/route.js";
import { getCarbonInventorySubcategoriesSummaryRoute } from "@/features/carbonInventories/getCarbonInventorySubcategoriesSummary/route.js";
import { addSubcategoriesToCarbonInventoryRoute } from "@/features/carbonInventories/addSubcategoriesToCarbonInventory/route.js";
import { updateCarbonInventorySubcategoriesRoute } from "@/features/carbonInventories/updateCarbonInventorySubcategories/route.js";
import { toggleManualTotalEmissionsRoute } from "@/features/carbonInventories/toggleManualTotalEmissions/route.js";
import { syncCarbonInventoryLinesRoute } from "@/features/carbonInventories/syncCarbonInventoryLines/route.js";
import { getEmissionsSummaryCategoriesRoute } from "@/features/carbonInventories/getEmissionsSummaryCategories/route.js";
import { getMainActivityEquivalenceRoute } from "@/features/carbonInventories/getMainActivityEquivalence/route.js";
import { getSubcategoriesRankingRoute } from "@/features/carbonInventories/getSubcategoriesRanking/route.js";
import { getSectorRankingRoute } from "@/features/carbonInventories/getSectorRanking/route.js";
import { getSuggestedReductionPlanRoute } from "@/features/carbonInventories/getSuggestedReductionPlan/route.js";
import { getEmissionsDetailedSummaryRoute } from "@/features/carbonInventories/getEmissionsDetailedSummary/route.js";
import { getEmissionFactorsRoute } from "@/features/carbonInventories/getEmissionFactors/route.js";
import { getCarbonInventoryMetadataRoute } from "@/features/carbonInventories/getCarbonInventoryMetadata/route.js";
import { getCarbonInventoryBadgesRoute } from "@/features/carbonInventories/getCarbonInventoryBadges/route.js";
import { requestCalculationRoute } from "@/features/carbonInventories/requestCalculation/route.js";
import { requestVerificationRoute } from "@/features/carbonInventories/requestVerification/route.js";
import { getCarbonInventoriesMinimalRoute } from "@/features/carbonInventories/getCarbonInventoriesMinimal/route.js";
import { duplicateCarbonInventoryRoute } from "@/features/carbonInventories/duplicateCarbonInventory/route.js";
import { deleteCarbonInventoryRoute } from "@/features/carbonInventories/deleteCarbonInventory/route.js";
import { selfDeclareCarbonInventoryRoute } from "@/features/carbonInventories/selfDeclareCarbonInventory/route.js";
import { SystemRole } from "@repo/types";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.USER,
      SystemRole.ADMIN,
      SystemRole.SUPERADMIN,
    ])
  );
  getAllCarbonInventoriesRoute(fastify);
  getCarbonInventoryBadgesRoute(fastify, { public: true });
  getCarbonInventoryByIdRoute(fastify, { public: true });
  createCarbonInventoryRoute(fastify, { public: true });
  updateCarbonInventoryRoute(fastify, { public: true });
  getCarbonInventoryMethodologyRoute(fastify, { public: true });
  getCarbonInventorySubcategoriesSummaryRoute(fastify, { public: true });
  addSubcategoriesToCarbonInventoryRoute(fastify, { public: true });
  updateCarbonInventorySubcategoriesRoute(fastify, { public: true });
  toggleManualTotalEmissionsRoute(fastify, { public: true });
  syncCarbonInventoryLinesRoute(fastify, { public: true });
  getEmissionsSummaryCategoriesRoute(fastify, { public: true });
  getMainActivityEquivalenceRoute(fastify, { public: true });
  getSubcategoriesRankingRoute(fastify, { public: true });
  getSectorRankingRoute(fastify, { public: true });
  getSuggestedReductionPlanRoute(fastify, { public: true });
  getEmissionsDetailedSummaryRoute(fastify, { public: true });
  getEmissionFactorsRoute(fastify, { public: true });
  getCarbonInventoryMetadataRoute(fastify, { public: true });
  requestCalculationRoute(fastify);
  requestVerificationRoute(fastify);
  selfDeclareCarbonInventoryRoute(fastify);
  getCarbonInventoriesMinimalRoute(fastify);
  duplicateCarbonInventoryRoute(fastify);
  deleteCarbonInventoryRoute(fastify);
}
