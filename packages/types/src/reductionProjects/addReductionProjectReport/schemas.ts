import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const AddReductionProjectReportParamsSchema = z.object({
  id: IdSchema,
});

export const AddReductionProjectReportBodySchema = z
  .object({
    reductionYear: z
      .number()
      .int()
      .min(2000)
      .max(2100)
      .describe("The year of the reduction"),
    baselineValue: z
      .number()
      .nonnegative()
      .describe("Baseline scenario value in tCO2e"),
    projectValue: z
      .number()
      .nonnegative()
      .describe("Project scenario value in tCO2e"),
  })
  .strict();

export const AddReductionProjectReportResponseSchema = ReductionProjectSchema;
