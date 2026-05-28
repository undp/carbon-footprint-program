import {
  type PrismaClient,
  type Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CountrySectorSubsectorData = {
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
  sector: Prisma.CountrySectorCreateInput["name"];
  subsectors: Prisma.CountrySubsectorCreateInput["name"][];
}[];

const CountrySectorSubsectorDataSchema: z.ZodType<CountrySectorSubsectorData> =
  z.array(
    z.object({
      countryIsoCode: z.string().min(1),
      sector: z.string().min(1),
      subsectors: z.array(z.string().min(1)),
    })
  );

export async function seedCountrySectorSubsectors(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country sectors and subsectors...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  // Read country sector subsectors
  const countrySectorSubsectorsData = CountrySectorSubsectorDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(
          __dirname,
          "country_sector_subsectors.json",
          dataset
        ),
        "utf-8"
      )
    )
  );

  checkForDuplicates(countrySectorSubsectorsData, ["countryIsoCode", "sector"]);
  for (const item of countrySectorSubsectorsData) {
    checkForPrimitiveDuplicates(
      item.subsectors,
      `subsectors in ${item.countryIsoCode} - ${item.sector}`
    );
  }

  // Resolve sectors: upsert each by (countryId, name). The partial unique index
  // on (country_id, name) WHERE status = 'ACTIVE' prevents duplicates; we match
  // by the same predicate so re-running propagates any future field updates.
  const sectorsToUpsert = countrySectorSubsectorsData.map((item) => {
    const country = countryByIso.get(item.countryIsoCode);
    if (!country) {
      throw new Error(
        `Country '${item.countryIsoCode}' not found in dataset ${dataset}`
      );
    }
    return { countryId: country.id, name: item.sector };
  });

  for (const { countryId, name } of sectorsToUpsert) {
    const existing = await prisma.countrySector.findFirst({
      where: { countryId, name, status: CountrySectorStatus.ACTIVE },
      select: { id: true },
    });
    if (!existing) {
      await prisma.countrySector.create({
        data: { countryId, name, status: CountrySectorStatus.ACTIVE },
      });
    }
  }

  // Fetch active sectors to resolve subsector parent IDs
  const sectors = await prisma.countrySector.findMany({
    where: { status: CountrySectorStatus.ACTIVE },
  });
  const sectorMap = new Map(
    sectors.map((s) => [`${s.countryId}_${s.name}`, s])
  );

  // Resolve subsectors: same upsert pattern keyed on (countrySectorId, name)
  const subsectorsToUpsert: { countrySectorId: bigint; name: string }[] = [];
  for (const item of countrySectorSubsectorsData) {
    const country = countryByIso.get(item.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${item.countryIsoCode}' not found in dataset ${dataset}`
      );

    const sector = sectorMap.get(`${country.id}_${item.sector}`);
    if (!sector)
      throw new Error(
        `Sector '${item.sector}' not found for country '${item.countryIsoCode}' in dataset ${dataset}`
      );

    for (const subsectorName of item.subsectors) {
      subsectorsToUpsert.push({
        countrySectorId: sector.id,
        name: subsectorName,
      });
    }
  }

  for (const { countrySectorId, name } of subsectorsToUpsert) {
    const existing = await prisma.countrySubsector.findFirst({
      where: {
        countrySectorId,
        name,
        status: CountrySubsectorStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.countrySubsector.create({
        data: {
          countrySectorId,
          name,
          status: CountrySubsectorStatus.ACTIVE,
        },
      });
    }
  }

  console.log(
    `✓ Ensured ${sectorsToUpsert.length} sectors exist for dataset ${dataset}`
  );
  console.log(
    `✓ Ensured ${subsectorsToUpsert.length} subsectors exist for dataset ${dataset}`
  );
  console.log("✓ Country sectors and subsectors seeded successfully!");
}
