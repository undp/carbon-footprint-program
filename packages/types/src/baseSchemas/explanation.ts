import { z } from "zod";
import { IdSchema } from "../zod.js";

export const ExplanationBaseSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters separated by hyphens"
    )
    .describe("The slug identifier of the explanation"),
  name: z.string().describe("The human-readable name of the explanation"),
  description: z
    .string()
    .nullable()
    .describe("The optional human-readable description"),
  content: z.string().describe("The markdown content of the explanation"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The last update date"),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the explanation"
  ),
});
