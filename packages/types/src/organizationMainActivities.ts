import { z } from "zod";

export const GetAllOrganizationMainActivitiesQuerySchema = z
  .object({
    sectorId: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .describe("Optional country sector ID to filter by"),
    subsectorId: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .describe(
        "Optional country subsector ID to filter by (requires sectorId)"
      ),
  })
  .refine(
    (data) => {
      // If subsectorId is provided, sectorId must also be provided
      if (data.subsectorId && !data.sectorId) {
        return false;
      }
      return true;
    },
    {
      message: "subsectorId cannot be provided without sectorId",
      path: ["subsectorId"],
    }
  );

export type GetAllOrganizationMainActivitiesQuery = z.infer<
  typeof GetAllOrganizationMainActivitiesQuerySchema
>;

export const GetAllOrganizationMainActivitiesResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of the main activity"),
    name: z.string().min(1).describe("The name of the main activity"),
  })
);

export type GetAllOrganizationMainActivitiesResponse = z.infer<
  typeof GetAllOrganizationMainActivitiesResponseSchema
>;

