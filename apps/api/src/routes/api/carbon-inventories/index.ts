import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllCarbonInventoriesRoute } from "@/features/carbonInventories/getAllCarbonInventories/route.js";
import { getCarbonInventoryByIdRoute } from "@/features/carbonInventories/getCarbonInventoryById/route.js";
import { createCarbonInventoryRoute } from "@/features/carbonInventories/createCarbonInventory/route.js";
import { updateCarbonInventoryRoute } from "@/features/carbonInventories/updateCarbonInventory/route.js";
import { getCarbonInventoryMethodologyRoute } from "@/features/carbonInventories/getCarbonInventoryMethodology/route.js";
import { getCarbonInventoryMethodologyExportRoute } from "@/features/carbonInventories/getCarbonInventoryMethodologyExport/route.js";
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
import { requestLineFileUploadRoute } from "@/features/carbonInventories/requestLineFileUpload/route.js";
import { confirmLineFileUploadRoute } from "@/features/carbonInventories/confirmLineFileUpload/route.js";
import { deleteLineFileRoute } from "@/features/carbonInventories/deleteLineFile/route.js";
import { previewLineFileRoute } from "@/features/carbonInventories/previewLineFile/route.js";
import { getCarbonInventoryFilesManifestRoute } from "@/features/carbonInventories/getCarbonInventoryFilesManifest/route.js";
import { SystemRole } from "@repo/types";

export default function carbonInventoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      /* CALCULATOR ROUTES */
      createCarbonInventoryRoute,
      getCarbonInventoryByIdRoute,
      getCarbonInventoryMethodologyRoute,
      getCarbonInventoryMethodologyExportRoute,
      getCarbonInventorySubcategoriesSummaryRoute,
      getEmissionsSummaryCategoriesRoute,
      getMainActivityEquivalenceRoute,
      getSubcategoriesRankingRoute,
      getSectorRankingRoute,
      getSuggestedReductionPlanRoute,
      getReductionPlanRoute,
      getEmissionsDetailedSummaryRoute,
      getEmissionFactorsRoute,
      getCarbonInventoryMetadataRoute,
      getCarbonInventoryAccessRoute,
      getSubcategoryRecommendationsRoute,
      // At the following routes, user needs at least CONTRIBUTOR org. role for this inventory
      addSubcategoriesToCarbonInventoryRoute,
      updateCarbonInventoryRoute,
      updateCarbonInventorySubcategoriesRoute,
      toggleManualTotalEmissionsRoute,
      syncCarbonInventoryLinesRoute,
      requestLineFileUploadRoute,
      confirmLineFileUploadRoute,
      deleteLineFileRoute,
      previewLineFileRoute,
      getCarbonInventoryFilesManifestRoute,

      /* GETTERS */
      getCarbonInventoriesMinimalRoute,
      getAllCarbonInventoriesRoute,
      getCarbonInventoryBadgesRoute,

      /* MANAGEMENT */
      claimCarbonInventoryRoute,
      assignOrganizationToCarbonInventoryRoute,
      // user needs at least CONTRIBUTOR org. role for this inventory
      selfDeclareCarbonInventoryRoute,
      requestCalculationRoute,
      requestVerificationRoute,
      duplicateCarbonInventoryRoute,
      deleteCarbonInventoryRoute,
    ],
    {
      defaultSystemRoles: [
        SystemRole.USER,
        SystemRole.ADMIN,
        SystemRole.SUPERADMIN,
      ],
    }
  );
}
