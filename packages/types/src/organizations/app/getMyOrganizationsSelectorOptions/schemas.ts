import { z } from "zod";
import {
  OrganizationBaseSchema,
  OrganizationSummaryBaseSchema,
} from "../../../baseSchemas/index.js";

export const GetMyOrganizationsSelectorOptionsResponseSchema = z.array(
  z.object({
    id: OrganizationBaseSchema.shape.id,
    name: OrganizationSummaryBaseSchema.shape.name,
    isAccredited: OrganizationSummaryBaseSchema.shape.isAccredited,
    lastSubmissionStatus:
      OrganizationSummaryBaseSchema.shape.lastSubmissionStatus,
  })
);
