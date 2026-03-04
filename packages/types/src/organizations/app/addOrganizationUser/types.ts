import { z } from "zod";
import {
  AddOrganizationUserParamsSchema,
  AddOrganizationUserBodySchema,
  AddOrganizationUserResponseSchema,
} from "./schemas.js";

export type AddOrganizationUserParams = z.infer<
  typeof AddOrganizationUserParamsSchema
>;

export type AddOrganizationUserBody = z.infer<
  typeof AddOrganizationUserBodySchema
>;

export type AddOrganizationUserResponse = z.infer<
  typeof AddOrganizationUserResponseSchema
>;
