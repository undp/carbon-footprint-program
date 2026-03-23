import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectStatusSchema } from "../baseSchemas.js";

export const GetAllSealApplicationsQuerySchema = z.object({
  organizationId: IdSchema.describe("The ID of the organization"),
});

export const SealApplicationSchema = z
  .object({
    id: IdSchema.describe("The ID of the submission"),
    reductionProjectId: IdSchema.describe(
      "The ID of the reduction project"
    ),
    projectName: z.string().describe("The name of the reduction project"),
    reductionYear: z
      .number()
      .int()
      .nullable()
      .describe("The year of the reduction"),
    reductionValue: z
      .number()
      .nullable()
      .describe("The reduction value in tCO2e"),
    status: ReductionProjectStatusSchema.describe(
      "The status of the reduction project"
    ),
    submittedAt: z.iso.datetime().describe("The submission date"),
    reviewComments: z
      .string()
      .nullable()
      .describe("Reviewer comments (if rejected)"),
  })
  .strict();

export const GetAllSealApplicationsResponseSchema = z.array(
  SealApplicationSchema
);
