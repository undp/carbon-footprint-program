import { PrismaClient, generatePrismaAdapter } from "../../index.js";
import { ENVIRONMENT } from "../../environment.js";
import { seedRoles } from "./scripts/seedRoles.js";
import { seedMeasurementUnits } from "./scripts/seedMeasurementUnits.js";
import { seedCountrySectorSubsectors } from "./scripts/seedCountrySectorSubsectors.js";
import { seedCountries } from "./scripts/seedCountries.js";
import { seedCountryJobPositions } from "./scripts/seedCountryJobPositions.js";
import { seedCountryOrganizationSizes } from "./scripts/seedCountryOrganizationSizes.js";

const prisma = new PrismaClient({
  adapter: generatePrismaAdapter(),
});

const environment = ENVIRONMENT === "testing" ? "testing" : "base";

async function main() {
  await prisma.$connect();
  await seedRoles(prisma, environment);
  await seedMeasurementUnits(prisma, environment);
  await seedCountries(prisma, environment);
  await seedCountryJobPositions(prisma, environment); // needs the countries to be seeded first
  await seedCountryOrganizationSizes(prisma, environment); // needs the countries to be seeded first
  await seedCountrySectorSubsectors(prisma, environment); // needs the countries to be seeded first
}

main()
  .then(async () => {
    console.log(
      `Seeding completed successfully for environment: ${environment}`
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
