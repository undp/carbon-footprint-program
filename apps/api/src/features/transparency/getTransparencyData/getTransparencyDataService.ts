import type { PrismaClient } from "@repo/database";
import type { GetTransparencyDataResponse } from "@repo/types";

interface InventoryRow {
  organizationData: unknown;
  status: string;
  year: number | null;
}

interface OrganizationJson {
  name?: string | null;
  sectorId?: string | null;
  subsectorId?: string | null;
}

interface CompanyAggregation {
  sectorId: string | null;
  subsectorId: string | null;
  hasSubmitted: boolean;
  hasVerified: boolean;
  years: Set<number>;
}

export const getTransparencyDataService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetTransparencyDataResponse> => {
  const whereClause: Record<string, unknown> = {
    status: { in: ["SUBMITTED", "VERIFIED"] },
  };

  if (year) {
    whereClause.year = year;
  }

  const inventories = (await prismaClient.carbonInventory.findMany({
    where: whereClause,
    select: {
      organizationData: true,
      status: true,
      year: true,
    },
  })) as InventoryRow[];

  // Group by company name
  const companiesMap = new Map<string, CompanyAggregation>();

  for (const inventory of inventories) {
    const orgData = inventory.organizationData as OrganizationJson | null;
    const companyName =
      typeof orgData?.name === "string" ? orgData.name : null;

    if (!companyName) continue;

    const existing = companiesMap.get(companyName);

    if (existing) {
      if (inventory.status === "SUBMITTED") existing.hasSubmitted = true;
      if (inventory.status === "VERIFIED") existing.hasVerified = true;
      if (inventory.year) existing.years.add(inventory.year);
    } else {
      companiesMap.set(companyName, {
        sectorId: orgData?.sectorId ?? null,
        subsectorId: orgData?.subsectorId ?? null,
        hasSubmitted: inventory.status === "SUBMITTED",
        hasVerified: inventory.status === "VERIFIED",
        years: inventory.year ? new Set([inventory.year]) : new Set(),
      });
    }
  }

  // Collect unique sector and subsector IDs for batch resolution
  const sectorIds = new Set<bigint>();
  const subsectorIds = new Set<bigint>();

  for (const company of companiesMap.values()) {
    if (company.sectorId) sectorIds.add(BigInt(company.sectorId));
    if (company.subsectorId) subsectorIds.add(BigInt(company.subsectorId));
  }

  // Batch resolve sector names
  const sectorNames = new Map<string, string>();
  if (sectorIds.size > 0) {
    const sectors = await prismaClient.countrySector.findMany({
      where: { id: { in: [...sectorIds] } },
      select: { id: true, name: true },
    });
    for (const s of sectors) {
      sectorNames.set(String(s.id), s.name);
    }
  }

  // Batch resolve subsector names
  const subsectorNames = new Map<string, string>();
  if (subsectorIds.size > 0) {
    const subsectors = await prismaClient.countrySubsector.findMany({
      where: { id: { in: [...subsectorIds] } },
      select: { id: true, name: true },
    });
    for (const s of subsectors) {
      subsectorNames.set(String(s.id), s.name);
    }
  }

  // Build response
  const result: GetTransparencyDataResponse = [];

  for (const [companyName, data] of companiesMap) {
    result.push({
      companyName,
      sectorName: data.sectorId
        ? (sectorNames.get(data.sectorId) ?? null)
        : null,
      subsectorName: data.subsectorId
        ? (subsectorNames.get(data.subsectorId) ?? null)
        : null,
      recognitions: {
        measurement: data.hasSubmitted || data.hasVerified,
        verification: data.hasVerified,
        reduction: false, // Not implemented yet
      },
      years: [...data.years].sort((a, b) => b - a),
    });
  }

  // Sort alphabetically by company name
  result.sort((a, b) => a.companyName.localeCompare(b.companyName));

  return result;
};
