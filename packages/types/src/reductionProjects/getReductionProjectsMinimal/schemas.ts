import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectDisplayStatusSchema } from "../schemas.js";

export const GetReductionProjectsMinimalParamsSchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe("Optional year filter on the project `year` column"),
});

export type GetReductionProjectsMinimalParams = z.infer<
  typeof GetReductionProjectsMinimalParamsSchema
>;

export const GetReductionProjectsMinimalItemSchema = z.object({
  id: IdSchema,
  name: z.string().nullable(),
  organizationId: IdSchema.nullable(),
  status: ReductionProjectDisplayStatusSchema,
  year: z.number().int().nullable(),
});

export const GetReductionProjectsMinimalResponseSchema = z.array(
  GetReductionProjectsMinimalItemSchema
);
