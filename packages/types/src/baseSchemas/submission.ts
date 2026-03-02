import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { SubmissionStatus } from "../enums.js";

export const SubmissionStatusSchema = z.enum(SubmissionStatus);

export const SubmissionBaseSchema = z.object({
  id: IdSchema,
  subjectId: IdSchema,
  status: SubmissionStatusSchema,
  reviewerId: IdSchema.nullable(),
  reviewComments: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
