import { z } from "zod";
import { MagnitudeSchema } from "../shared/schemas.js";

export const GetAllMeasurementUnitsParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllMeasurementUnitsResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of measurement unit"),
    name: z.string().min(1).describe("The name of measurement unit"),
    magnitude: MagnitudeSchema,
    abbreviation: z
      .string()
      .min(1)
      .describe("The abbreviation of measurement unit"),
    base_factor: z.number().describe("The base factor of measurement unit"),
    is_base: z
      .boolean()
      .describe("Whether the measurement unit is a base unit"),
  })
);

export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
