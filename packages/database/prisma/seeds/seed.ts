import { PrismaClient, generatePrismaAdapter } from "../../index.js";
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
