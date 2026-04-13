import type { z } from "zod";
import type { CarbonInventoryDisplayStatusSchema } from "./schemas.js";
import type { SubmissionType } from "../enums.js";

export type CarbonInventoryDisplayStatus = z.infer<
  typeof CarbonInventoryDisplayStatusSchema
>;

export type CarbonInventoryRecognitionsType = Exclude<
  SubmissionType,
  "ORGANIZATION_ACCREDITATION"
>;
