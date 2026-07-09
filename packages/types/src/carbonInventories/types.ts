import type { z } from "zod";
import type {
  CarbonInventoryDisplayStatusSchema,
  LineFileSummarySchema,
} from "./schemas.js";
import { SubmissionType } from "../enums.js";

export type CarbonInventoryDisplayStatus = z.infer<
  typeof CarbonInventoryDisplayStatusSchema
>;

export type LineFileSummary = z.infer<typeof LineFileSummarySchema>;

export type CarbonInventoryRecognitionsType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;

export const CARBON_INVENTORY_RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] =
  [
    SubmissionType.CARBON_INVENTORY_CALCULATION,
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
  ];

export const REDUCTION_PROJECT_RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] =
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION];

export const NEUTRALIZATION_PLAN_RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] =
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION];

export const RECOGNITION_SUBMISSION_TYPES: CarbonInventoryRecognitionsType[] = [
  ...CARBON_INVENTORY_RECOGNITION_SUBMISSION_TYPES,
  ...REDUCTION_PROJECT_RECOGNITION_SUBMISSION_TYPES,
  ...NEUTRALIZATION_PLAN_RECOGNITION_SUBMISSION_TYPES,
];
