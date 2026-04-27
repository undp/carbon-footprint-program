import { z } from "zod";
import { AdminListStatusFilterSchema } from "../../../admin/shared/schemas.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const GetAllAdminCountrySubsectorsQuerySchema = z.object({
  status: AdminListStatusFilterSchema.optional(),
});

export const GetAllAdminCountrySubsectorsResponseSchema = z.array(
  AdminCountrySubsectorSchema
);
