import { PrismaClient, generatePrismaAdapter } from "../../index.js";
import { seedRoles } from "./seedRoles.js";
import { seedMeasurementUnits } from "./seedMeasurementUnits.js";
import { seedCountrySectorSubsectors } from "./seedCountrySectorSubsectors.js";
import { seedCountries } from "./seedCountries.js";
import { seedCountryJobPositions } from "./seedCountryJobPositions.js";
import { seedCountryOrganizationSizes } from "./seedCountryOrganizationSizes.js";

const prisma = new PrismaClient({
  adapter: generatePrismaAdapter(),
});

async function main() {
  await seedRoles(prisma);
  await seedMeasurementUnits(prisma);
  await seedCountries(prisma);
  await seedCountryJobPositions(prisma);
  await seedCountryOrganizationSizes(prisma);
  await seedCountrySectorSubsectors(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
