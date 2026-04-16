import { z } from "zod";

const currentYear = new Date().getFullYear();

// Shared year query parameter schema: optional, positive integer, max current year
// Uses /^\d+$/ guard (consistent with pagination schemas) to reject scientific
// notation ("1e3") and hex ("0x10") before numeric coercion.
export const YearQueryParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Year must be a positive integer" })
  .transform((val) => Number(val))
  .pipe(
    z
      .number()
      .int()
      .positive()
      .max(currentYear, { message: `Year must not exceed ${currentYear}` })
  )
  .optional();

// Shared limit query parameter schema: required, positive integer
export const LimitQueryParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Limit must be a positive integer" })
  .transform((val) => Number(val))
  .pipe(z.number().int().positive());

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export const GetAdminDashboardKpisQuerySchema = z.object({
  year: YearQueryParamSchema,
});

export const GetAdminDashboardKpisResponseSchema = z.object({
  totalOrganizations: z
    .number()
    .int()
    .nonnegative()
    .describe("Total number of enrolled organizations"),
  measuringOrganizations: z
    .number()
    .int()
    .nonnegative()
    .describe("Enrolled organizations with at least one active self-declared inventory"),
  totalEmissions: z
    .number()
    .nonnegative()
    .describe("Total emissions from self-declared ACTIVE inventories in tCO2e"),
  verifiedEmissions: z
    .number()
    .nonnegative()
    .describe("Verified emissions from verified ACTIVE inventories in tCO2e"),
  recognitionsEarned: z
    .number()
    .int()
    .nonnegative()
    .describe("Total approved recognitions (APPROVED + APPROVED_AUTOMATICALLY)"),
  recognitionsUnderReview: z
    .number()
    .int()
    .nonnegative()
    .describe("Total recognitions pending review"),
});

// ─── Sector Chart ─────────────────────────────────────────────────────────────

export const GetAdminDashboardSectorChartQuerySchema = z.object({
  limit: LimitQueryParamSchema,
  year: YearQueryParamSchema,
});

const SectorRankingEntrySchema = z.object({
  sectorName: z.string().nullable().describe("Sector name, or null for ungrouped organizations"),
  organizationCount: z.number().int().nonnegative(),
});

const SectorEmissionsEntrySchema = z.object({
  sectorName: z.string().nullable().describe("Sector name, or null for ungrouped organizations"),
  totalEmissions: z.number().nonnegative().describe("Total emissions in tCO2e"),
});

export const GetAdminDashboardSectorChartResponseSchema = z.object({
  sectorRanking: z
    .array(SectorRankingEntrySchema)
    .describe("Top-N sectors by enrolled organization count"),
  sectorEmissions: z
    .array(SectorEmissionsEntrySchema)
    .describe("Top-N sectors by total emissions"),
});

// ─── Category Chart ───────────────────────────────────────────────────────────

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
