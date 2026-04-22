import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { BadgeCatalogEntrySchema } from "../listBadges/schemas.js";

export const ActivateBadgeParamsSchema = z.object({
  id: IdSchema.describe("The badge ID to activate"),
});

export const ActivateBadgeResponseSchema = BadgeCatalogEntrySchema;
