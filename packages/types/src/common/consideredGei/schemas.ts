import { z } from "zod";

// Deleting any entries from this enum could potentially break the application.
// This enum is used to type and parse the considered gei from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const ConsideredGeiSchema = z.enum([
  "CO2",
  "CH4",
  "HFC",
  "PFC",
  "SF6",
  "NF3",
]);

export const ConsideredGeiEnum = ConsideredGeiSchema.enum;
