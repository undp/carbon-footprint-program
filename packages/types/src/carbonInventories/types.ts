import type { z } from "zod";
import type { CarbonInventoryDisplayStatusSchema } from "./schemas.js";
import { SubmissionType } from "../enums.js";

export type CarbonInventoryDisplayStatus = z.infer<
  typeof CarbonInventoryDisplayStatusSchema
>;

export type CarbonInventoryRecognitionsType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;

export const RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PROJECT_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
];
