import { z } from "zod";
import { RouteFileTypeSchema } from "../../baseSchemas/file.js";
import { FilenameSchema } from "../../baseSchemas/filename.js";

export const ConfirmUploadBodySchema = z.object({
  uuid: z.uuid().describe("The file UUID returned by request-upload"),
  originalName: FilenameSchema.describe("The original file name"),
  fileType: RouteFileTypeSchema.describe("The type of file being uploaded"),
});

export const ConfirmUploadResponseSchema = z.object({
  uuid: z.uuid().describe("The confirmed file UUID"),
});
