import { z } from "zod";

// Deleting any entries from this enum could potentially break the application.
// This enum is used to type and parse the gwp source from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const GwpSourceSchema = z.enum(["IPCC_AR4", "IPCC_AR5", "IPCC_AR6"]);

export const GwpSourceEnum = GwpSourceSchema.enum;
