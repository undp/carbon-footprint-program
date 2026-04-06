import { z } from "zod";

// ── Query ──────────────────────────────────────────────────────────
export const AdminDashboardKpisQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional()
    .describe("Filter KPIs by year"),
});

// ── Response ───────────────────────────────────────────────────────
export const AdminDashboardKpisResponseSchema = z.object({
  organizations: z.object({
    total: z
      .number()
      .int()
      .nonnegative()
      .describe("Total registered organizations"),
    measuringInYear: z
      .number()
      .int()
      .nonnegative()
      .describe("Organizations measuring in the selected year"),
  }),

  emissions: z.object({
    total: z.number().nonnegative().describe("Total emissions in tCO₂e"),
    verified: z.number().nonnegative().describe("Verified emissions in tCO₂e"),
  }),

  recognitions: z.object({
    awarded: z.number().int().nonnegative().describe("Recognitions awarded"),
    inApplication: z
      .number()
      .int()
      .nonnegative()
      .describe("Recognitions in application process"),
  }),

  submissionSummary: z.object({
    inReview: z
      .number()
      .int()
      .nonnegative()
      .describe("Submissions currently in review"),
    approved: z.number().int().nonnegative().describe("Approved submissions"),
    objected: z
      .number()
      .int()
      .nonnegative()
      .describe("Submissions with objections"),
  }),

  organizationsBySector: z
    .array(
      z.object({
        sectorName: z.string().describe("Sector name"),
        count: z
          .number()
          .int()
          .nonnegative()
          .describe("Number of organizations in this sector"),
        emissions: z
          .number()
          .nonnegative()
          .describe("Total emissions for this sector in tCO₂e"),
      })
    )
    .describe("Organizations grouped by sector"),

  emissionsByScope: z.object({
    scope1Percentage: z
      .number()
      .min(0)
      .max(100)
      .describe("Scope 1 emissions percentage"),
    scope2Percentage: z
      .number()
      .min(0)
      .max(100)
      .describe("Scope 2 emissions percentage"),
    scope3Percentage: z
      .number()
      .min(0)
      .max(100)
      .describe("Scope 3 emissions percentage"),
  }),
});
