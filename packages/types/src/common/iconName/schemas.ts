import { z } from "zod";

// Deleting any entries from this enum could potentially break the application.
// This enum is used to type and parse the icon name from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const IconNameSchema = z.enum([
  "FACTORY",
  "BOLT",
  "TRUCK",
  "FLAME",
  "CAR",
  "SNOWFLAKE",
  "WATER",
  "RECYCLE",
  "AGRICULTURE",
  "BUILDING",
  "FLIGHT",
  "TRAIN",
  "ELECTRIC",
  "SOLAR",
  "FOREST",
  "WASTE",
  "CONSTRUCTION",
  "SCIENCE",
  "FUEL",
  "GLOBE",
  "DIRECT_EMISSION",
  "INDIRECT_EMISSION",
  "OTHERS",
]);

export const IconNameValue = IconNameSchema.enum;

/** For form state: allows "" as initial value, validates non-empty on submit */
export const IconNameFormSchema = z.union([z.literal(""), IconNameSchema]);
