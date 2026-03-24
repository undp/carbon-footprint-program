import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  ReductionProjectFileSchema,
  ReductionProjectFileTypeSchema,
} from "../baseSchemas.js";

export const AddReductionProjectDocumentParamsSchema = z.object({
  id: IdSchema,
});

export const AddReductionProjectDocumentBodySchema = z
  .object({
    fileType: ReductionProjectFileTypeSchema.describe("The type of document"),
    fileName: z.string().min(1).describe("The name of the file"),
    fileSizeBytes: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("The file size in bytes"),
    mimeType: z.string().optional().describe("The MIME type of the file"),
  })
  .strict();

export const AddReductionProjectDocumentResponseSchema =
  ReductionProjectFileSchema;
