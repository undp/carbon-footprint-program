import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetCarbonInventoryFilesManifestParamsSchema = z
  .object({
    id: IdSchema.describe("The carbon inventory ID"),
  })
  .strict();

export const FilesManifestEntrySchema = z.object({
  fileUuid: z.uuid().describe("The file UUID"),
  lineId: z
    .string()
    .describe(
      "The owning CarbonInventoryLine id (BigInt serialized as string)"
    ),
  categoryName: z.string().describe("The category name of the owning line"),
  subcategoryName: z
    .string()
    .describe("The subcategory name of the owning line"),
  originalName: z
    .string()
    .describe("The original filename as uploaded by the user"),
  sasUrl: z.url().describe("Signed Azure blob SAS URL with read permission"),
  expiresAt: z.iso
    .datetime()
    .describe("ISO timestamp when this entry's SAS URL expires"),
  sizeBytes: z.number().int().nonnegative().describe("File size in bytes"),
  mimeType: z.string().describe("The file MIME type"),
});

export const GetCarbonInventoryFilesManifestResponseSchema = z.object({
  files: z
    .array(FilesManifestEntrySchema)
    .describe("Entries for every ACTIVE line file in the inventory"),
  expiresAt: z.iso
    .datetime()
    .describe(
      "ISO timestamp when all SAS URLs in this response expire (shared)"
    ),
});
