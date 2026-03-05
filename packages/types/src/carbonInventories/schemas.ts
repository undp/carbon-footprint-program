import { z } from "zod";

export const CarbonInventoryDisplayStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED_TO_CALCULATION",
  "CALCULATION_OBJECTED",
  "CALCULATION_REJECTED",
  "CALCULATION_APPROVED",
  "SUBMITTED_TO_VERIFICATION",
  "VERIFICATION_OBJECTED",
  "VERIFICATION_REJECTED",
  "VERIFICATION_APPROVED",
  "DELETED",
]);

export const CarbonInventoryDisplayStatusEnum =
  CarbonInventoryDisplayStatusSchema.enum;
