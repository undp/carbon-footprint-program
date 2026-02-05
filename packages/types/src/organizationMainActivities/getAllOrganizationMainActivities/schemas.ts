import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetAllOrganizationMainActivitiesQuerySchema = z
  .object({
    sectorId: z
      .string()
      .regex(/^\d+$/)
      .describe("Optional country sector ID to filter by"),
    subsectorId: z
      .string()
      .regex(/^\d+$/)
      .describe(
        "Optional country subsector ID to filter by (requires sectorId)"
      ),
  })
  .partial()
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

export const GetAllOrganizationMainActivitiesResponseSchema = z.array(
  z.object({
    id: IdSchema.describe("The ID of the main activity"),
    name: z.string().min(1).describe("The name of the main activity"),
  })
);
