import { z } from "zod";
import {
  ReductionProjectFileSchema,
  ReductionProjectFileTypeSchema,
} from "../baseSchemas.js";

export const AddReductionProjectDocumentParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
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
