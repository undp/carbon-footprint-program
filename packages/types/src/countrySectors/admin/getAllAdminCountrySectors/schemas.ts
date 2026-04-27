import { z } from "zod";
import { AdminListStatusFilterSchema } from "../../../admin/shared/schemas.js";
import { AdminCountrySectorSchema } from "../shared/schemas.js";

export const GetAllAdminCountrySectorsQuerySchema = z.object({
  status: AdminListStatusFilterSchema.optional(),
});

export const GetAllAdminCountrySectorsResponseSchema = z.array(
  AdminCountrySectorSchema
);
