import {
  BadgeStatus,
  FileStatus,
  PrismaClient,
  generatePrismaAdapter,
} from "@repo/database";
import { type StorageAdapter } from "@repo/storage";
import { SystemParameterKeyEnum } from "@repo/types";
import { SEEDS_DATASET } from "./environment.js";
import { preflightStorage } from "./scripts/preflightStorage.js";
import { seedMagnitudes } from "./scripts/seedMagnitudes.js";
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

  // Seeds are additive and intended for a fresh database. Re-running them
  // against a populated database is unsafe (duplicates, partial drift, PK
  // churn), so if the database already contains data we skip seeding entirely.
  // Country is reference data created only by the seed, never by the app, so
  // its presence is a reliable "already seeded" marker. To reseed, reset the
  // database first (`pnpm db:reset`).
  const existingCountries = await prisma.country.count();
  if (existingCountries > 0) {
    console.log(
      `Database already contains data — skipping seed for dataset '${SEEDS_DATASET}'.`
    );
    return;
  }

  // Object storage is REQUIRED for the base dataset: it holds the badge SVGs and
  // the terms & conditions PDF. Preflight it here, AFTER the country-count gate
  // and BEFORE any database write, so a missing/unreachable backend fails fast
  // and leaves the database untouched — the gate above stays un-tripped, so a
  // re-run after storage is fixed seeds cleanly. The `testing` dataset seeds no
  // files, so it needs no storage.
  let storage: StorageAdapter | undefined;
  if (SEEDS_DATASET === "base") {
    storage = await preflightStorage(process.env);
  }

  await seedMagnitudes(prisma, SEEDS_DATASET);
  await seedMeasurementUnits(prisma, SEEDS_DATASET); // needs the magnitudes to be seeded first
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
  await seedBadges(prisma, SEEDS_DATASET, storage);
  await seedTermsConditions(prisma, SEEDS_DATASET, storage); // needs TERMS_CONDITIONS_FILE_UUID system parameter row to exist

  // Only claim success once the base run actually produced the storage-backed
  // data. The preflight + injected adapter removed the silent-skip path, but
  // this backstop guarantees the exit code never lies about a partial base seed
  // (e.g. a future regression that skips badges/T&C): if either is missing, fail
  // loudly instead of printing the success line.
  if (SEEDS_DATASET === "base") {
    const seededOk = await verifyBaseSeedArtifacts(prisma);
    if (!seededOk) {
      console.error(
        "\n✗ Seeding did NOT complete: badges and/or terms & conditions are " +
          "missing after the base run. The database may be partially seeded — " +
          "reset it (`pnpm db:reset`), verify object storage, and re-run."
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log(`Seeding completed successfully for dataset: '${SEEDS_DATASET}'`);
}

/**
 * Confirms the storage-backed base artifacts exist: at least one active badge,
 * and a terms & conditions file registered in the system parameter and still
 * active. Independent of the seeders' internal bookkeeping — it asserts the
 * end state directly.
 */
async function verifyBaseSeedArtifacts(prisma: PrismaClient): Promise<boolean> {
  const activeBadgeCount = await prisma.badge.count({
    where: { status: BadgeStatus.ACTIVE },
  });

  const termsParam = await prisma.systemParameter.findUnique({
    where: { key: SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID },
    select: { value: true },
  });
  const termsFile = termsParam?.value
    ? await prisma.file.findFirst({
        where: { uuid: termsParam.value, status: FileStatus.ACTIVE },
        select: { uuid: true },
      })
    : null;

  return activeBadgeCount > 0 && termsFile !== null;
}

main()
  .catch((e) => {
    console.error(e);
    // Let Node exit after pending tasks (like $disconnect) finish
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
