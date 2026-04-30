import { z } from "zod";
import { AdminListStatusFilterSchema } from "../../../admin/shared/schemas.js";
import { AdminCountryOrganizationSizeSchema } from "../shared/schemas.js";

export const GetAllAdminCountryOrganizationSizesQuerySchema = z.object({
  status: AdminListStatusFilterSchema.optional(),
});

export const GetAllAdminCountryOrganizationSizesResponseSchema = z.array(
  AdminCountryOrganizationSizeSchema
);
