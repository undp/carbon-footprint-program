import { PrismaClient, generatePrismaAdapter } from "../../index.js";
import { SEEDS_DATASET } from "../../environment.js";
import { seedRoles } from "./scripts/seedRoles.js";
import { seedMeasurementUnits } from "./scripts/seedMeasurementUnits.js";
import { seedCountrySectorSubsectors } from "./scripts/seedCountrySectorSubsectors.js";
import { seedCountries } from "./scripts/seedCountries.js";
import { seedCountryJobPositions } from "./scripts/seedCountryJobPositions.js";
import { seedCountryOrganizationSizes } from "./scripts/seedCountryOrganizationSizes.js";

const prisma = new PrismaClient({
  adapter: generatePrismaAdapter(),
});

async function main() {
  await prisma.$connect();
  await seedRoles(prisma, SEEDS_DATASET);
  await seedMeasurementUnits(prisma, SEEDS_DATASET);
  await seedCountries(prisma, SEEDS_DATASET);
  await seedCountryJobPositions(prisma, SEEDS_DATASET); // needs the countries to be seeded first
  await seedCountryOrganizationSizes(prisma, SEEDS_DATASET); // needs the countries to be seeded first
  await seedCountrySectorSubsectors(prisma, SEEDS_DATASET); // needs the countries to be seeded first
}

main()
  .then(async () => {
    console.log(
      `Seeding completed successfully for dataset: '${SEEDS_DATASET}'`
    );
  })
  .catch(async (e) => {
    console.error(e);
    // Let Node exit after pending tasks (like $disconnect) finish
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
