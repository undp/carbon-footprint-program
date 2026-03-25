import { z } from "zod";

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

export type IconName = z.infer<typeof IconNameSchema>;
