import { z } from "zod";
import { ReductionProjectBaseSchema } from "../../baseSchemas/index.js";

export const GetReductionProjectsMinimalParamsSchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe("Optional year filter on the project `year` column"),
});

export const GetReductionProjectsMinimalItemSchema =
  ReductionProjectBaseSchema.pick({
    id: true,
    name: true,
    organizationId: true,
    status: true,
    year: true,
  });

export const GetReductionProjectsMinimalResponseSchema = z.array(
  GetReductionProjectsMinimalItemSchema
);
