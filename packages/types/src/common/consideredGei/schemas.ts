import { z } from "zod";
import { REDUCTION_PROJECT_CONSIDERED_GEI } from "@repo/constants";

// Deleting any entries from this enum could potentially break the application.
// This enum is used to type and parse the considered gei from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const ConsideredGeiSchema = z.enum(REDUCTION_PROJECT_CONSIDERED_GEI);

export const ConsideredGeiEnum = ConsideredGeiSchema.enum;

// Parses the `considered_gei` column, stored as a JSON array (provider-portable:
// jsonb on PostgreSQL, nvarchar(max) on SQL Server). Validates each element
// against the GEI enum.
export const ConsideredGeiArraySchema = z.array(ConsideredGeiSchema);
