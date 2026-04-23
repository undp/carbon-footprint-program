import { z } from "zod";
import {
  GetAdminDashboardSectorChartQuerySchema,
  GetAdminDashboardSectorChartResponseSchema,
} from "./schemas.js";

export type GetAdminDashboardSectorChartQuery = z.infer<
  typeof GetAdminDashboardSectorChartQuerySchema
>;
export type GetAdminDashboardSectorChartResponse = z.infer<
  typeof GetAdminDashboardSectorChartResponseSchema
>;
