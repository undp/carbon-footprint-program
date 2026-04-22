import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { BadgeCatalogEntrySchema } from "../listBadges/schemas.js";

export const DeactivateBadgeParamsSchema = z.object({
  id: IdSchema.describe("The badge ID to deactivate"),
});

export const DeactivateBadgeResponseSchema = BadgeCatalogEntrySchema;
