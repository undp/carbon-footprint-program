import type { PrismaClient } from "@repo/database";
import type { OrganizationDataField } from "@repo/types";
import { roundEmissions } from "../utils.js";
import type { CategoryData, InventoryBase } from "../helpers.js";
import { kgToTon } from "@/utils/number.js";

export async function resolveInventoryAttributes(
  prismaClient: PrismaClient,
  inventory: InventoryBase,
  orgData: OrganizationDataField
) {
  const sectorId = orgData?.sectorId ?? null;
  const sizeId = orgData?.sizeId ?? null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  const [sector, size, mainActivity, methodology] = await Promise.all([
    sectorId
      ? prismaClient.countrySector.findUnique({
          where: { id: BigInt(sectorId) },
          select: { name: true },
        })
      : null,
    sizeId
      ? prismaClient.countryOrganizationSize.findUnique({
          where: { id: BigInt(sizeId) },
          select: { name: true },
        })
      : null,
    mainActivityId
      ? prismaClient.organizationMainActivity.findUnique({
          where: { id: BigInt(mainActivityId) },
          select: { name: true },
        })
      : null,
    prismaClient.methodologyVersion.findUnique({
      where: { id: inventory.methodologyVersionId },
      select: { country: { select: { name: true } } },
    }),
  ]);

  return {
    name: inventory.name,
    companyName: inventory.organization?.summary?.name ?? null,
    countryName: methodology?.country.name ?? null,
    sectorName: sector?.name ?? null,
    sizeName: size?.name ?? null,
    branchCount: null,
    mainActivityName: mainActivity?.name ?? null,
    mainActivityQuantity: orgData?.mainActivityQuantity ?? null,
  };
}

export async function calculateEquivalence(
  prismaClient: PrismaClient,
  orgData: OrganizationDataField,
  totalEmissions: number
) {
  const mainActivityQuantity = orgData?.mainActivityQuantity ?? null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  if (!mainActivityQuantity || mainActivityQuantity <= 0 || !mainActivityId) {
    return null;
  }

  const mainActivity = await prismaClient.organizationMainActivity.findUnique({
    where: { id: BigInt(mainActivityId) },
    select: { name: true },
  });

  const rate = totalEmissions / mainActivityQuantity;

  return {
    rate: roundEmissions(rate),
    activityName: mainActivity?.name ?? "actividad principal",
  };
}

export function buildGHGBreakdown(
  category: CategoryData,
  linesBySubcategory: Map<
    string,
    Array<{
      inputs: Array<{
        inputType: string;
        factor: { emissionFactor: { gasDetails: unknown } | null } | null;
        result: { totalEmissions: unknown } | null;
      }>;
      subcategory: { name: string };
    }>
  >
) {
  return category.subcategories.map((sub) => {
    const subLines = linesBySubcategory.get(sub.id) ?? [];

    let co2Fossil = 0;
    let ch4 = 0;
    let n2o = 0;
    let hfc = 0;
    let pfc = 0;
    let sf6 = 0;
    let nf3 = 0;

    for (const line of subLines) {
      const input = line.inputs[0];
      if (!input?.factor?.emissionFactor?.gasDetails) continue;

      const gasDetails = input.factor.emissionFactor.gasDetails as Record<
        string,
        unknown
      >;
      const lineEmissions = input.result
        ? kgToTon(Number(input.result.totalEmissions))
        : 0;

      co2Fossil += toNumber(gasDetails.co2Fossil ?? gasDetails.co2 ?? 0);
      ch4 += toNumber(gasDetails.ch4 ?? 0);
      n2o += toNumber(gasDetails.n2o ?? 0);
      hfc += toNumber(gasDetails.hfc ?? 0);
      pfc += toNumber(gasDetails.pfc ?? 0);
      sf6 += toNumber(gasDetails.sf6 ?? 0);
      nf3 += toNumber(gasDetails.nf3 ?? 0);

      if (Object.keys(gasDetails).length === 0 && lineEmissions > 0) {
        co2Fossil += lineEmissions;
      }
    }

    return {
      subcategoryName: sub.name,
      totalTCO2e: roundEmissions(sub.subtotal),
      co2Fossil: roundEmissions(co2Fossil),
      ch4: roundEmissions(ch4),
      n2o: roundEmissions(n2o),
      hfc: roundEmissions(hfc),
      pfc: roundEmissions(pfc),
      sf6: roundEmissions(sf6),
      nf3: roundEmissions(nf3),
    };
  });
}

function toNumber(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}
