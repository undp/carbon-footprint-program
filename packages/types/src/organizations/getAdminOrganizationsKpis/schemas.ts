import { z } from "zod";

export const GetAdminOrganizationsKpisResponseSchema = z.object({
  total: z.number(),
  blockedTotal: z.number(),
  notAccreditedTotal: z.number(),
  accreditedTotal: z.number(),
});
