import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const CreateCountrySubsectorRequestSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(255, { message: "Name cannot exceed 255 characters" })
    .describe("The name of the country subsector"),
  countrySectorId: IdSchema.describe("The ID of the parent country sector"),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description cannot exceed 2000 characters" })
    .nullable()
    .describe("Description of the country subsector (string or null)"),
});

export const CreateCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
