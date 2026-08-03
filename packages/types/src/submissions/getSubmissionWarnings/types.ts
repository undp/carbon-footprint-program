import { z } from "zod";
import {
  CollisionFieldSchema,
  CollisionStateSchema,
  GetSubmissionWarningsParamsSchema,
  GetSubmissionWarningsResponseSchema,
  OrganizationIdentityCollisionMetadataSchema,
  OrganizationIdentityTupleSchema,
  WarningSchema,
  WarningTypeSchema,
} from "./schemas.js";

export type GetSubmissionWarningsParams = z.infer<
  typeof GetSubmissionWarningsParamsSchema
>;

export type GetSubmissionWarningsResponse = z.infer<
  typeof GetSubmissionWarningsResponseSchema
>;

export type Warning = z.infer<typeof WarningSchema>;

export type WarningTypeValue = z.infer<typeof WarningTypeSchema>;

export type CollisionState = z.infer<typeof CollisionStateSchema>;

export type CollisionField = z.infer<typeof CollisionFieldSchema>;

export type OrganizationIdentityCollisionMetadata = z.infer<
  typeof OrganizationIdentityCollisionMetadataSchema
>;

export type OrganizationIdentityTuple = z.infer<
  typeof OrganizationIdentityTupleSchema
>;
