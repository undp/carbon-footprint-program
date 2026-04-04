import { z } from "zod";

export const ReductionProjectDisplayStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "REJECTED",
  "APPROVED",
  "DELETED",
]);

export const ReductionProjectDisplayStatusEnum =
  ReductionProjectDisplayStatusSchema.enum;
