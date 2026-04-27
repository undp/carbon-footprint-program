import { z } from "zod";

export const ExplanationBaseSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*$/,
      "Slug must contain only alphanumeric characters separated by underscores"
    )
    .describe("The slug identifier of the explanation"),
  name: z.string().describe("The human-readable name of the explanation"),
  description: z
    .string()
    .nullable()
    .describe("The optional human-readable description"),
  content: z.string().describe("The markdown content of the explanation"),
});
