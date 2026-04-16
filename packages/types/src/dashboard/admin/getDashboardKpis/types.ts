import { z } from "zod";
import {
  GetAdminDashboardKpisQuerySchema,
  GetAdminDashboardKpisResponseSchema,
} from "./schemas.js";

export type GetAdminDashboardKpisQuery = z.infer<
  typeof GetAdminDashboardKpisQuerySchema
>;
export type GetAdminDashboardKpisResponse = z.infer<
  typeof GetAdminDashboardKpisResponseSchema
>;
