import { z } from "zod";
import {
  GetAdminDashboardKpisQuerySchema,
  GetAdminDashboardKpisResponseSchema,
  GetAdminDashboardSectorChartQuerySchema,
  GetAdminDashboardSectorChartResponseSchema,
  GetAdminDashboardCategoryChartQuerySchema,
  GetAdminDashboardCategoryChartResponseSchema,
} from "./schemas.js";

export type GetAdminDashboardKpisQuery = z.infer<
  typeof GetAdminDashboardKpisQuerySchema
>;
export type GetAdminDashboardKpisResponse = z.infer<
  typeof GetAdminDashboardKpisResponseSchema
>;

export type GetAdminDashboardSectorChartQuery = z.infer<
  typeof GetAdminDashboardSectorChartQuerySchema
>;
export type GetAdminDashboardSectorChartResponse = z.infer<
  typeof GetAdminDashboardSectorChartResponseSchema
>;

export type GetAdminDashboardCategoryChartQuery = z.infer<
  typeof GetAdminDashboardCategoryChartQuerySchema
>;
export type GetAdminDashboardCategoryChartResponse = z.infer<
  typeof GetAdminDashboardCategoryChartResponseSchema
>;
