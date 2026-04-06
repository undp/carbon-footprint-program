import { z } from "zod";
import {
  AdminDashboardKpisQuerySchema,
  AdminDashboardKpisResponseSchema,
} from "./schemas.js";

export type AdminDashboardKpisQuery = z.infer<
  typeof AdminDashboardKpisQuerySchema
>;

export type AdminDashboardKpisResponse = z.infer<
  typeof AdminDashboardKpisResponseSchema
>;
