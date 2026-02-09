import { z } from "zod";
import type { GetAdminOrganizationsKpisResponseSchema } from "./schemas.ts";

export type GetAdminOrganizationsKpisResponse = z.infer<
  typeof GetAdminOrganizationsKpisResponseSchema
>;
