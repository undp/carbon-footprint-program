import { z } from "zod";

export const CarbonInventoryDisplayStatusSchema = z.enum([
  "DRAFT",
  "SELF_DECLARED",
  "SUBMITTED_TO_CALCULATION",
  "CALCULATION_REVIEWED",
  "CALCULATION_REJECTED",
  "CALCULATION_APPROVED",
  "SUBMITTED_TO_VERIFICATION",
  "VERIFICATION_REVIEWED",
  "VERIFICATION_REJECTED",
  "VERIFICATION_APPROVED",
  "DELETED",
]);

export const CarbonInventoryDisplayStatusEnum =
  CarbonInventoryDisplayStatusSchema.enum;
