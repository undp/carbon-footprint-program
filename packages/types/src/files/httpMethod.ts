import { z } from "zod";

/**
 * HTTP method a client must use when uploading a file to a presigned URL
 * issued by the API. Backend-agnostic — the value is set by whichever
 * storage adapter generated the URL.
 */
export enum HttpUploadMethod {
  PUT = "PUT",
}

export const HttpUploadMethodSchema = z.enum(HttpUploadMethod);
