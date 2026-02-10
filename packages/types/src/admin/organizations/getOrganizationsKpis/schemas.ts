import { z } from "zod";

export const GetOrganizationsKpisResponseSchema = z.object({
  total: z.int().nonnegative(),
  blockedTotal: z.int().nonnegative(),
  notAccreditedTotal: z.int().nonnegative(),
  accreditedTotal: z.int().nonnegative(),
});
