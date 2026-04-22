import { z } from "zod";
import { BadgeCatalogEntrySchema } from "../badgeDTO/schemas.js";

export const ListBadgesResponseSchema = z.array(BadgeCatalogEntrySchema);
