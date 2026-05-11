import { z } from "zod";
import { IdSchema } from "../zod.js";
import { MagnitudeStatus } from "@repo/database/enums";

export const MagnitudeStatusSchema = z.enum(MagnitudeStatus);

export const MagnitudeBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the magnitude."),
  code: z
    .string()
    .describe(
      "Stable symbolic identifier for the magnitude (e.g. MASS). Immutable after creation."
    ),
  name: z.string().describe("Admin-editable display label for the magnitude."),
  isSystem: z
    .boolean()
    .describe("Whether the magnitude is a platform-seeded system magnitude."),
  status: MagnitudeStatusSchema.describe(
    "Soft-delete status of the magnitude."
  ),
});

export type MagnitudeBase = z.infer<typeof MagnitudeBaseSchema>;
