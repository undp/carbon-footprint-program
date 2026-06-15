import { z } from "zod";
import { ReductionProjectBaseSchema } from "../baseSchemas/index.js";

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

export const ReductionProjectMutationDataSchema =
  ReductionProjectBaseSchema.pick({
    name: true,
    organizationId: true,
    carbonInventoryId: true,
    implementationDate: true,
    description: true,
    subcategoryId: true,
    gwpUsed: true,
    consideredGei: true,
    reportedElsewhere: true,
    reportedElsewhereDescription: true,
    year: true,
    baselineScenario: true,
    projectScenario: true,
  });

export type ReductionProjectMutationData = z.infer<
  typeof ReductionProjectMutationDataSchema
>;
