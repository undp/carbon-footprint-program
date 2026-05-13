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
  // Include subcategories that have active lines but no computed emissions yet,
  // so the review screen lists every active line (complete or incomplete) and
  // the user can see what is still pending. An incomplete line surfaces with a
  // null factor and null emissions in the mapping below.
  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory,
    { includeIncompleteSubcategories: true }
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

      // `hasLines` toggles the screen between the detailed lines table
      // (factor-based) and the manual-mode subtotal row, so it stays
      // factor-only. The `lines` payload itself emits every line — DIRECT
      // included — so the Excel `Line ID` column matches every
      // `line-{lineId}` filename in `archivos/`. A subcategory is uniformly
      // factor-based or manual, never mixed.
      const hasLines = subLines.some(
        (l) => l.inputs[0] && l.inputs[0].inputType !== "DIRECT"
      );

      const emissionLines = subLines
        .map((line) => {
          const input = line.inputs[0];
          if (!input) return null;

          const emissionSource =
            [input.selection1?.value, input.selection2?.value]
              .filter(Boolean)
              .join(" / ") || sub.name;

          // Null (not 0) when there is no computed result yet, so the UI
          // can render "—" for an incomplete line instead of a misleading 0.
          const lineEmissions = input.result
            ? kgToTon(Number(input.result.totalEmissions))
            : null;

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
        .filter((item) => item !== null);

      return {
        id: sub.id,
        name: sub.name,
        description,
        icon: IconNameSchema.parse(sub.icon),
        hasLines,
        lines: emissionLines,
        subtotal: sub.subtotal,
        percentage: subcategoryPercentages[subIdx],
        hasIncompleteLines: sub.hasIncompleteLines,
      };
    });

    // Build GHG breakdown for category position=1.
    // NOTE: since incomplete subcategories are now included, this may contain
    // zero-valued rows (subcategories whose lines have no result yet). The
    // GHGBreakdownTable is currently not rendered (see the TODO in
    // EmissionSummaryScreen.tsx); when it is re-enabled, filter out the
    // zero-emission rows there if they should not be displayed.
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
      hasIncompleteLines: subcategories.some((sub) => sub.hasIncompleteLines),
    };
  });

  return {
    inventoryAttributes,
    totalEmissions,
    equivalence,
    categories,
  };
};
