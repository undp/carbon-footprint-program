import { z } from "zod";
import {
  YearQueryParamSchema,
  LimitQueryParamSchema,
} from "../../../common/queryParams/schemas.js";

export const GetAdminDashboardSectorChartQuerySchema = z.object({
  limit: LimitQueryParamSchema,
  year: YearQueryParamSchema,
});

const SectorRankingEntrySchema = z.object({
  sectorName: z
    .string()
    .nullable()
    .describe("Sector name, or null for ungrouped organizations"),
  organizationCount: z.number().int().nonnegative(),
});

const SectorEmissionsEntrySchema = z.object({
  sectorName: z
    .string()
    .nullable()
    .describe("Sector name, or null for ungrouped organizations"),
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
