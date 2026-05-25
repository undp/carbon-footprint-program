import { z } from "zod";
import { type FileUploadType } from "@repo/constants";
import { FileStatus } from "../enums.js";
import { FilenameSchema } from "./filename.js";

export const RouteFileTypeSchema = z.enum([
  "SUBMISSION",
  "BADGE",
  "LEGAL",
  "CARBON_INVENTORY",
]);

type RouteFileType = z.infer<typeof RouteFileTypeSchema>;

// Compile-time drift guard: RouteFileTypeSchema and FILE_UPLOAD_TYPES in
// @repo/constants must list the same members. If either side adds or removes
// a value without the other, one of these assignments fails type-check.
type _AssertRouteSubsetOfPolicy = RouteFileType extends FileUploadType
  ? true
  : never;
type _AssertPolicySubsetOfRoute = FileUploadType extends RouteFileType
  ? true
  : never;
const _routeSubsetOfPolicy: _AssertRouteSubsetOfPolicy = true;
const _policySubsetOfRoute: _AssertPolicySubsetOfRoute = true;
void _routeSubsetOfPolicy;
void _policySubsetOfRoute;

export const FileStatusSchema = z.enum(FileStatus);

export const FileBaseSchema = z.object({
  uuid: z.uuid().describe("The UUID of the file"),
  originalName: FilenameSchema.describe("The original file name"),
  mimeType: z.string().describe("The MIME type of the file"),
  sizeBytes: z.number().int().nonnegative().describe("The file size in bytes"),
  status: FileStatusSchema.describe("The status of the file"),
  createdAt: z.iso.datetime().describe("The upload date"),
  deletedAt: z.iso.datetime().nullable().describe("The deletion date"),
});
