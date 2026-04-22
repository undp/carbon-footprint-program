import { z } from "zod";
import { BadgeDTOSchema, BadgeCatalogEntrySchema } from "./schemas.js";

export type BadgeDTO = z.infer<typeof BadgeDTOSchema>;
export type BadgeCatalogEntry = z.infer<typeof BadgeCatalogEntrySchema>;
