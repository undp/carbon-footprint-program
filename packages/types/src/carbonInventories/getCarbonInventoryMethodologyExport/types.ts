import { z } from "zod";
import type {
  GetCarbonInventoryMethodologyExportParamsSchema,
  GetCarbonInventoryMethodologyExportResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryMethodologyExportParams = z.infer<
  typeof GetCarbonInventoryMethodologyExportParamsSchema
>;

export type GetCarbonInventoryMethodologyExportResponse = z.infer<
  typeof GetCarbonInventoryMethodologyExportResponseSchema
>;
