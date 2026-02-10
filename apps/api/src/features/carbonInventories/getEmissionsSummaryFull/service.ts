import type { PrismaClient } from "@repo/database";
import type {
  GetEmissionsSummaryFullResponse,
  OrganizationData,
} from "@repo/types";
import { distributePercentages, roundEmissions } from "../resultsHelpers.js";
import {
  fetchInventory,
  fetchCategoryData,
  type CategoryData,
} from "../resultsShared.js";
import { kgToTon } from "@/utils/number.js";

export const getEmissionsSummaryFullService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionsSummaryFullResponse> => {
  const inventory = await fetchInventory(prismaClient, id);
  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory
  );

  // 1. Resolve inventory attributes
  const orgData = inventory.organizationData as OrganizationData | null;
  const inventoryAttributes = await resolveInventoryAttributes(
    prismaClient,
    inventory,
    orgData
  );

  // 2. Calculate equivalence
  const equivalence = await calculateEquivalence(
    prismaClient,
    orgData,
    totalEmissions
  );

  // 3. Fetch all active lines with full details
  const lines = await prismaClient.carbonInventoryLine.findMany({
    where: { carbonInventoryId: inventory.id, status: "ACTIVE" },
    include: {
      subcategory: {
        select: {
          id: true,
          name: true,
          description: true,
          categoryId: true,
        },
      },
      inputs: {
        where: { isActive: true },
        take: 1,
        include: {
          selection1: { select: { value: true } },
          selection2: { select: { value: true } },
          measurementUnit: { select: { name: true } },
          factor: {
            include: {
              emissionFactor: {
                select: { gasDetails: true },
              },
              appliedFactorRateUnit: {
                select: { abbreviation: true },
              },
            },
          },
          result: { select: { totalEmissions: true } },
        },
      },
    },
  });

  // Group lines by subcategory ID
  const linesBySubcategory = new Map<string, (typeof lines)[number][]>();
  for (const line of lines) {
    const subId = line.subcategoryId.toString();
    if (!linesBySubcategory.has(subId)) {
      linesBySubcategory.set(subId, []);
    }
    linesBySubcategory.get(subId)!.push(line);
  }

  // 4. Build category percentages
  const categorySubtotals = categoryData.map((c) => c.subtotal);
  const categoryPercentages = distributePercentages(
    categorySubtotals,
    totalEmissions
  );

  // 5. Build categories with subcategories and lines
  const categories = categoryData.map((category, catIdx) => {
    // Calculate subcategory percentages within entire inventory
    const subcategorySubtotals = category.subcategories.map((s) => s.subtotal);
    const subcategoryPercentages = distributePercentages(
      subcategorySubtotals,
      totalEmissions
    );

    const subcategories = category.subcategories.map((sub, subIdx) => {
      const subLines = linesBySubcategory.get(sub.id) ?? [];
      const firstLine = subLines[0];
      const description = firstLine?.subcategory.description ?? null;

      // Determine if subcategory has factor-based lines
      const factorBasedLines = subLines.filter((l) => {
        const input = l.inputs[0];
        return input && input.inputType !== "DIRECT";
      });
      const hasLines = factorBasedLines.length > 0;

      const emissionLines = hasLines
        ? factorBasedLines.map((line) => {
            const input = line.inputs[0];
            const emissionSource =
              [input.selection1?.value, input.selection2?.value]
                .filter(Boolean)
                .join(" / ") || sub.name;

            const lineEmissions = input.result
              ? kgToTon(Number(input.result.totalEmissions))
              : 0;

            return {
              lineId: line.id.toString(),
              emissionSource,
              measurementUnitName: input.measurementUnit?.name ?? null,
              quantity: input.quantity ? Number(input.quantity) : null,
              factorValue: input.factor
                ? Number(input.factor.appliedFactorValue)
                : null,
              factorSource: input.factor?.appliedFactorSource ?? null,
              emissions: roundEmissions(lineEmissions),
            };
          })
        : [];

      return {
        id: sub.id,
        name: sub.name,
        description,
        hasLines,
        lines: emissionLines,
        subtotal: roundEmissions(sub.subtotal),
        percentage: subcategoryPercentages[subIdx],
      };
    });

    // Build GHG breakdown for category position=1
    const ghgBreakdown =
      category.position === 1
        ? buildGHGBreakdown(category, linesBySubcategory)
        : null;

    return {
      id: category.id,
      name: category.name,
      synonyms: category.synonyms,
      position: category.position,
      subcategories,
      subtotal: roundEmissions(category.subtotal),
      percentage: categoryPercentages[catIdx],
      ghgBreakdown,
    };
  });

  return {
    inventoryAttributes,
    totalEmissions: roundEmissions(totalEmissions),
    equivalence,
    categories,
  };
};

async function resolveInventoryAttributes(
  prismaClient: PrismaClient,
  inventory: { id: bigint; name: string | null; methodologyVersionId: bigint },
  orgData: OrganizationData | null
) {
  const sectorId = orgData?.sectorId ? String(orgData.sectorId) : null;
  const sizeId = orgData?.sizeId ? String(orgData.sizeId) : null;
  const mainActivityId = orgData?.mainActivityId
    ? String(orgData.mainActivityId)
    : null;

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
    companyName: typeof orgData?.name === "string" ? orgData.name : null,
    countryName: methodology?.country.name ?? null,
    sectorName: sector?.name ?? null,
    sizeName: size?.name ?? null,
    branchCount: null,
    mainActivityName: mainActivity?.name ?? null,
    mainActivityQuantity:
      typeof orgData?.mainActivityQuantity === "number"
        ? orgData.mainActivityQuantity
        : null,
  };
}

async function calculateEquivalence(
  prismaClient: PrismaClient,
  orgData: OrganizationData | null,
  totalEmissions: number
) {
  const mainActivityQuantity =
    typeof orgData?.mainActivityQuantity === "number"
      ? orgData.mainActivityQuantity
      : null;
  const mainActivityId = orgData?.mainActivityId
    ? String(orgData.mainActivityId)
    : null;

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

function buildGHGBreakdown(
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

      // gasDetails may contain gas-level proportions or absolute values
      // Try to extract known gas fields
      co2Fossil += toNumber(gasDetails.co2Fossil ?? gasDetails.co2 ?? 0);
      ch4 += toNumber(gasDetails.ch4 ?? 0);
      n2o += toNumber(gasDetails.n2o ?? 0);
      hfc += toNumber(gasDetails.hfc ?? 0);
      pfc += toNumber(gasDetails.pfc ?? 0);
      sf6 += toNumber(gasDetails.sf6 ?? 0);
      nf3 += toNumber(gasDetails.nf3 ?? 0);

      // If gasDetails is empty, all gases remain 0 and subtotal carries line emissions
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
