import { z } from "zod";
import { AdminListStatusFilterSchema } from "../../../countrySectors/admin/getAllAdminCountrySectors/schemas.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const GetAllAdminOrganizationMainActivitiesQuerySchema = z.object({
  status: AdminListStatusFilterSchema.optional(),
});

export const GetAllAdminOrganizationMainActivitiesResponseSchema = z.array(
  AdminOrganizationMainActivitySchema
);
