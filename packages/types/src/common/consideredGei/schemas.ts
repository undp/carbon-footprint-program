import { z } from "zod";

export const ConsideredGeiSchema = z.enum([
  "CO2",
  "CH4",
  "HFC",
  "PFC",
  "SF6",
  "NF3",
]);

export const ConsideredGeiEnum = ConsideredGeiSchema.enum;
