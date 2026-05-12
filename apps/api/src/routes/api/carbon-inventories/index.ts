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
import { getReductionPlanRoute } from "@/features/carbonInventories/getReductionPlan/route.js";
import { getEmissionsDetailedSummaryRoute } from "@/features/carbonInventories/getEmissionsDetailedSummary/route.js";
import { getEmissionFactorsRoute } from "@/features/carbonInventories/getEmissionFactors/route.js";
import { getCarbonInventoryMetadataRoute } from "@/features/carbonInventories/getCarbonInventoryMetadata/route.js";
import { getCarbonInventoryAccessRoute } from "@/features/carbonInventories/getCarbonInventoryAccess/route.js";
import { getCarbonInventoryBadgesRoute } from "@/features/carbonInventories/getCarbonInventoryBadges/route.js";
import { requestCalculationRoute } from "@/features/carbonInventories/requestCalculation/route.js";
import { requestVerificationRoute } from "@/features/carbonInventories/requestVerification/route.js";
import { getCarbonInventoriesMinimalRoute } from "@/features/carbonInventories/getCarbonInventoriesMinimal/route.js";
import { duplicateCarbonInventoryRoute } from "@/features/carbonInventories/duplicateCarbonInventory/route.js";
import { deleteCarbonInventoryRoute } from "@/features/carbonInventories/deleteCarbonInventory/route.js";
import { selfDeclareCarbonInventoryRoute } from "@/features/carbonInventories/selfDeclareCarbonInventory/route.js";
import { getSubcategoryRecommendationsRoute } from "@/features/carbonInventories/getSubcategoryRecommendations/route.js";
import { claimCarbonInventoryRoute } from "@/features/carbonInventories/claimCarbonInventory/route.js";
import { assignOrganizationToCarbonInventoryRoute } from "@/features/carbonInventories/assignOrganizationToCarbonInventory/route.js";
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

  /* CALCULATOR ROUTES */
  createCarbonInventoryRoute(fastify, { allowAnonymousAccess: true });
  getCarbonInventoryByIdRoute(fastify, { allowAnonymousAccess: true });
  getCarbonInventoryMethodologyRoute(fastify, { allowAnonymousAccess: true });
  getCarbonInventorySubcategoriesSummaryRoute(fastify, {
    allowAnonymousAccess: true,
  });
  getEmissionsSummaryCategoriesRoute(fastify, { allowAnonymousAccess: true });
  getMainActivityEquivalenceRoute(fastify, { allowAnonymousAccess: true });
  getSubcategoriesRankingRoute(fastify, { allowAnonymousAccess: true });
  getSectorRankingRoute(fastify, { allowAnonymousAccess: true });
  getSuggestedReductionPlanRoute(fastify, { allowAnonymousAccess: true });
  getReductionPlanRoute(fastify);
  getEmissionsDetailedSummaryRoute(fastify, { allowAnonymousAccess: true });
  getEmissionFactorsRoute(fastify, { allowAnonymousAccess: true });
  getCarbonInventoryMetadataRoute(fastify, { allowAnonymousAccess: true });
  getCarbonInventoryAccessRoute(fastify, { allowAnonymousAccess: true });
  getSubcategoryRecommendationsRoute(fastify, { allowAnonymousAccess: true });
  // At the following routes, user needs at least CONTRIBUTOR org. role for this inventory
  addSubcategoriesToCarbonInventoryRoute(fastify, {
    allowAnonymousAccess: true,
  });
  updateCarbonInventoryRoute(fastify, { allowAnonymousAccess: true });
  updateCarbonInventorySubcategoriesRoute(fastify, {
    allowAnonymousAccess: true,
  });
  toggleManualTotalEmissionsRoute(fastify, { allowAnonymousAccess: true });
  syncCarbonInventoryLinesRoute(fastify, { allowAnonymousAccess: true });

  /* GETTERS */
  getCarbonInventoriesMinimalRoute(fastify);
  getAllCarbonInventoriesRoute(fastify);
  getCarbonInventoryBadgesRoute(fastify);

  /* MANAGEMENT */
  claimCarbonInventoryRoute(fastify);
  assignOrganizationToCarbonInventoryRoute(fastify);
  // user needs at least CONTRIBUTOR org. role for this inventory
  selfDeclareCarbonInventoryRoute(fastify);
  requestCalculationRoute(fastify);
  requestVerificationRoute(fastify);
  duplicateCarbonInventoryRoute(fastify);
  deleteCarbonInventoryRoute(fastify);
}
