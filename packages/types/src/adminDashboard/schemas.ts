import { z } from "zod";

export const AdminDashboardKpisQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
});

export const AdminDashboardKpisResponseSchema = z.object({
  organizations: z.object({
    total: z.number().int().nonnegative(),
    measuringInYear: z.number().int().nonnegative(),
  }),
  emissions: z.object({
    total: z.number().nonnegative(),
    verified: z.number().nonnegative(),
  }),
  recognitions: z.object({
    awarded: z.number().int().nonnegative(),
    inApplication: z.number().int().nonnegative(),
  }),
  submissionSummary: z.object({
    inReview: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    objected: z.number().int().nonnegative(),
  }),
  organizationsBySector: z.array(
    z.object({
      sectorName: z.string(),
      count: z.number().int().nonnegative(),
      emissions: z.number().nonnegative(),
    })
  ),
  emissionsByScope: z.object({
    scope1Percentage: z.number().nonnegative(),
    scope2Percentage: z.number().nonnegative(),
    scope3Percentage: z.number().nonnegative(),
  }),
});
