import { z } from "zod";
import { IdSchema } from "../zod.js";

export const ExplanationBaseSchema = z.object({
  slug: z.string().min(1).describe("The slug identifier of the explanation"),
  content: z.string().describe("The markdown content of the explanation"),
  visible: z.boolean().describe("Whether the explanation is visible"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The last update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the explanation"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the explanation"
  ),
});
