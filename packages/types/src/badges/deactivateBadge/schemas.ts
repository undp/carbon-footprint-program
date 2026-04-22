import { z } from "zod";
import { BadgeCatalogEntrySchema } from "../badgeDTO/schemas.js";

export const DeactivateBadgeParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .describe("The ID of the badge to deactivate"),
});

export const DeactivateBadgeResponseSchema = BadgeCatalogEntrySchema;
