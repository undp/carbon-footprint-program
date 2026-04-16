import { z } from "zod";
import { YearQueryParamSchema } from "../../../common/queryParams/schemas.js";

export const GetAdminDashboardCategoryChartQuerySchema = z.object({
  year: YearQueryParamSchema,
});

const CategoryEmissionsEntrySchema = z.object({
  categoryName: z.string(),
  totalEmissions: z.number().nonnegative().describe("Total emissions in tCO2e"),
});

const MethodologyEmissionsSchema = z.object({
  methodologyVersionId: z.number().int().positive(),
  methodologyVersionName: z.string(),
  categoryEmissions: z.array(CategoryEmissionsEntrySchema),
});

export const GetAdminDashboardCategoryChartResponseSchema = z.object({
  methodologies: z
    .array(MethodologyEmissionsSchema)
    .describe("Methodologies with emissions per category, sorted newest first"),
});
