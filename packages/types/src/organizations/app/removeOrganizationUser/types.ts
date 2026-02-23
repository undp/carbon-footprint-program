import { z } from "zod";
import {
  RemoveOrganizationUserParamsSchema,
  RemoveOrganizationUserResponseSchema,
} from "./schemas.js";

export type RemoveOrganizationUserParams = z.infer<
  typeof RemoveOrganizationUserParamsSchema
>;

export type RemoveOrganizationUserResponse = z.infer<
  typeof RemoveOrganizationUserResponseSchema
>;
