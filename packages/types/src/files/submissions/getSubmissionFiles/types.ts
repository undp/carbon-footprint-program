import { z } from "zod";
import {
  GetSubmissionFilesParamsSchema,
  GetSubmissionFilesQuerySchema,
  GetSubmissionFilesResponseSchema,
} from "./schemas.js";

export type GetSubmissionFilesParams = z.infer<
  typeof GetSubmissionFilesParamsSchema
>;

export type GetSubmissionFilesQuery = z.infer<
  typeof GetSubmissionFilesQuerySchema
>;

export type GetSubmissionFilesResponse = z.infer<
  typeof GetSubmissionFilesResponseSchema
>;
