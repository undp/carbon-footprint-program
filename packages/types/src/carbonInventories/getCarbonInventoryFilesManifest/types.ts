import { z } from "zod";
import type {
  FilesManifestEntrySchema,
  GetCarbonInventoryFilesManifestParamsSchema,
  GetCarbonInventoryFilesManifestResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryFilesManifestParams = z.infer<
  typeof GetCarbonInventoryFilesManifestParamsSchema
>;

export type FilesManifestEntry = z.infer<typeof FilesManifestEntrySchema>;

export type GetCarbonInventoryFilesManifestResponse = z.infer<
  typeof GetCarbonInventoryFilesManifestResponseSchema
>;
