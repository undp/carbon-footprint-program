import { z } from "zod";
import { IdSchema } from "../zod.js";

export const ExplanationBaseSchema = z.object({
  id: IdSchema.describe("The ID of the explanation"),
  name: z.string().min(1).describe("The name of the explanation"),
  content: z.string().describe("The markdown content of the explanation"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The last update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the explanation"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the explanation"
  ),
});
