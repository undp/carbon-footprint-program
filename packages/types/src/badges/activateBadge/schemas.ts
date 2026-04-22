import { z } from "zod";
import { BadgeCatalogEntrySchema } from "../badgeDTO/schemas.js";

export const ActivateBadgeParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .describe("The ID of the badge to activate"),
});

export const ActivateBadgeResponseSchema = BadgeCatalogEntrySchema;
