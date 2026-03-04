import { z } from "zod";
import {
  UpdateOrganizationUserRoleParamsSchema,
  UpdateOrganizationUserRoleBodySchema,
  UpdateOrganizationUserRoleResponseSchema,
} from "./schemas.js";

export type UpdateOrganizationUserRoleParams = z.infer<
  typeof UpdateOrganizationUserRoleParamsSchema
>;

export type UpdateOrganizationUserRoleBody = z.infer<
  typeof UpdateOrganizationUserRoleBodySchema
>;

export type UpdateOrganizationUserRoleResponse = z.infer<
  typeof UpdateOrganizationUserRoleResponseSchema
>;
