import { z } from "zod";
import {
  GetAdminDashboardCategoryChartQuerySchema,
  GetAdminDashboardCategoryChartResponseSchema,
} from "./schemas.js";

export type GetAdminDashboardCategoryChartQuery = z.infer<
  typeof GetAdminDashboardCategoryChartQuerySchema
>;
export type GetAdminDashboardCategoryChartResponse = z.infer<
  typeof GetAdminDashboardCategoryChartResponseSchema
>;
