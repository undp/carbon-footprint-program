import type { MethodologyExportPayload } from "@/features/methodologies/mappers.js";

/**
 * Narrows an exported methodology to the factors of a single footprint year.
 *
 * The maintainer's export lists every year on purpose -- it describes the
 * catalogue. This one is downloaded from inside a footprint and has to describe
 * what that footprint can capture with, so a factor of another year is noise at
 * best: the user cannot select it, yet it sits in the same sheet as the ones
 * they can, told apart only by the «Año» column.
 *
 * A footprint with no year keeps no factors, exactly as the capture step offers
 * it none.
 *
 * The year is dropped here rather than in the query because the export select
 * is shared with the maintainer's endpoint, which must not filter. The extra
 * rows are one methodology's catalogue across the years it covers, read once
 * per download.
 */
export const scopeMethodologyExportToYear = (
  methodology: MethodologyExportPayload,
  footprintYear: number | null
): MethodologyExportPayload => ({
  ...methodology,
  categories: methodology.categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
      emissionFactors: subcategory.emissionFactors.filter(
        (emissionFactor) => emissionFactor.year === footprintYear
      ),
    })),
  })),
});
