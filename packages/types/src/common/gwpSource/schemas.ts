import { z } from "zod";
import { REDUCTION_PROJECT_GWP_OPTIONS } from "@repo/constants";

// Deleting any entries from this enum could potentially break the application.
// This enum is used to type and parse the gwp source from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const GwpSourceSchema = z.enum(REDUCTION_PROJECT_GWP_OPTIONS);

export const GwpSourceEnum = GwpSourceSchema.enum;
