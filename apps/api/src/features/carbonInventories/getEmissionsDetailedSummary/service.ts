import type { PrismaClient } from "@repo/database";
import {
  type GetEmissionsDetailedSummaryResponse,
  IconNameSchema,
} from "@repo/types";
import {
  distributePercentages,
  safeParseCarbonInventoryOrganizationData,
} from "../utils.js";
import { fetchInventory, fetchCategoryData } from "../helpers.js";
import { kgToTon } from "@/utils/number.js";
import {
  resolveInventoryAttributes,
  calculateEquivalence,
  buildGHGBreakdown,
} from "./helper.js";

export const getEmissionsDetailedSummaryService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionsDetailedSummaryResponse> => {
  const inventory = await fetchInventory(prismaClient, id);
  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory
  );

  // 1. Resolve inventory attributes
  const orgData = safeParseCarbonInventoryOrganizationData(
    id,
    inventory.organizationData
  );
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
        ? factorBasedLines
            .map((line) => {
              const input = line.inputs[0];
              if (!input) return null;

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
                quantity: input.quantity?.toNumber() ?? null,
                factorValue: input.factor
                  ? input.factor.appliedFactorValue.toNumber()
                  : null,
                factorSource: input.factor?.appliedFactorSource ?? null,
                emissions: lineEmissions,
              };
            })
            .filter((item) => item !== null)
        : [];

      return {
        id: sub.id,
        name: sub.name,
        description,
        icon: IconNameSchema.parse(sub.icon),
        hasLines,
        lines: emissionLines,
        subtotal: sub.subtotal,
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
      icon: IconNameSchema.parse(category.icon),
      color: category.color,
      subcategories,
      subtotal: category.subtotal,
      percentage: categoryPercentages[catIdx],
      ghgBreakdown,
    };
  });

  return {
    inventoryAttributes,
    totalEmissions,
    equivalence,
    categories,
  };
};
