import { PrismaClient, generatePrismaAdapter } from "../../index.js";
import { SEEDS_DATASET } from "../../environment.js";
import { seedMeasurementUnits } from "./scripts/seedMeasurementUnits.js";
import { seedCountrySectorSubsectors } from "./scripts/seedCountrySectorSubsectors.js";
import { seedCountries } from "./scripts/seedCountries.js";
import { seedCountryJobPositions } from "./scripts/seedCountryJobPositions.js";
import { seedCountryOrganizationSizes } from "./scripts/seedCountryOrganizationSizes.js";
import { seedOrganizationMainActivities } from "./scripts/seedOrganizationMainActivities.js";
import { seedUsers } from "./scripts/seedUsers.js";
import { seedMethodologyData } from "./scripts/seedMethodologyData/index.js";
import { seedExplanations } from "./scripts/seedExplanations.js";
import { seedReductionPlanInitiatives } from "./scripts/seedReductionPlanInitiatives.js";
import { seedBadges } from "./scripts/seedBadges.js";
import { seedSystemParameters } from "./scripts/seedSystemParameters.js";
import { seedSubcategoryRecommendations } from "./scripts/seedSubcategoryRecommendations.js";
import { seedTermsConditions } from "./scripts/seedTermsConditions.js";

const prisma = new PrismaClient({
  adapter: generatePrismaAdapter(),
});

async function main() {
  await prisma.$connect();
  await seedMeasurementUnits(prisma, SEEDS_DATASET);
  await seedSystemParameters(prisma, SEEDS_DATASET);
  await seedCountries(prisma, SEEDS_DATASET);
  await seedCountryJobPositions(prisma, SEEDS_DATASET); // needs the countries to be seeded first
  await seedCountryOrganizationSizes(prisma, SEEDS_DATASET); // needs the countries to be seeded first
  await seedCountrySectorSubsectors(prisma, SEEDS_DATASET); // needs the countries to be seeded first
  await seedOrganizationMainActivities(prisma, SEEDS_DATASET); // needs the countries and sectors to be seeded first
  await seedUsers(prisma, SEEDS_DATASET); // needs the countries and job positions to be seeded first
  await seedMethodologyData(prisma, SEEDS_DATASET); // needs countries and status_catalog to be seeded first
  await seedExplanations(prisma, SEEDS_DATASET); // needs subcategories to be seeded first
  await seedSubcategoryRecommendations(prisma, SEEDS_DATASET); // needs subcategories and sectors to be seeded first
  await seedReductionPlanInitiatives(prisma, SEEDS_DATASET); // needs subcategories to be seeded first
  await seedBadges(prisma, SEEDS_DATASET);
  await seedTermsConditions(prisma, SEEDS_DATASET); // needs TERMS_CONDITIONS_FILE_UUID system parameter row to exist
}

main()
  .then(() => {
    console.log(
      `Seeding completed successfully for dataset: '${SEEDS_DATASET}'`
    );
  })
  .catch((e) => {
    console.error(e);
    // Let Node exit after pending tasks (like $disconnect) finish
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
