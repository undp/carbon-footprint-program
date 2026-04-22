import { z } from "zod";
import {
  BadgeDTOSchema,
  BadgeCatalogEntrySchema,
  ListBadgesResponseSchema,
} from "./schemas.js";

export type BadgeDTO = z.infer<typeof BadgeDTOSchema>;
export type BadgeCatalogEntry = z.infer<typeof BadgeCatalogEntrySchema>;
export type ListBadgesResponse = z.infer<typeof ListBadgesResponseSchema>;
