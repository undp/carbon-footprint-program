import { z } from "zod";
import { CarbonInventoryLineSchema } from "./base.js";

// Request schema for updating lines
export const UpdateCarbonInventoryLineRequestItemSchema = z
  .object({
    id: z.string().regex(/^\d+$/).describe("The ID of the line to update"),
    dimensions: z
      .record(z.string().regex(/^\d+$/), z.string().regex(/^\d+$/).nullable())
      .nullable()
      .describe(
        "Dimensions map with dimension ID as key and selected dimension value ID as value"
      ),
    measurementUnitId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the measurement unit"),
    quantity: z.number().nullable().describe("The quantity value"),
    factorSource: z.string().nullable().describe("The source of the factor"),
    baseFactorId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the base emission factor (null for manual factors)"),
    appliedFactorValue: z
      .number()
      .nullable()
      .describe("The applied factor value"),
    appliedFactorRateMeasurementUnitId: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .describe("The ID of the rate measurement unit of the factor"),
    manualTotalEmissions: z
      .number()
      .nullable()
      .describe("Manual total emissions value"),
    comment: z.string().nullable().describe("Comment for the line"),
  })
  .strict()
  .refine(
    (data) => {
      // If manualTotalEmissions is provided, all other fields must be null
      if (data.manualTotalEmissions !== null) {
        return (
          data.dimensions === null &&
          data.measurementUnitId === null &&
          data.quantity === null &&
          data.factorSource === null &&
          data.baseFactorId === null &&
          data.appliedFactorValue === null &&
          data.appliedFactorRateMeasurementUnitId === null
        );
      }
      return true;
    },
    {
      message:
        "If manualTotalEmissions is provided, all other fields must be null",
    }
  )
  .refine(
    (data) => {
      // If factorSource is "Factor Propio", baseFactorId must be null
      if (data.factorSource === "Factor Propio") {
        return data.baseFactorId === null;
      }
      return true;
    },
    {
      message: "If factorSource is 'Factor Propio', baseFactorId must be null",
    }
  )
  .refine(
    (data) => {
      // Quantity should be greater than 0 if provided
      if (data.quantity !== null) {
        return data.quantity > 0;
      }
      return true;
    },
    {
      message: "Quantity must be greater than 0 if provided",
    }
  );

export const UpdateCarbonInventoryLinesRequestSchema = z.array(
  UpdateCarbonInventoryLineRequestItemSchema
);

export const UpdateCarbonInventoryLinesResponseSchema = z.array(
  CarbonInventoryLineSchema
);

export type UpdateCarbonInventoryLineRequestItem = z.infer<
  typeof UpdateCarbonInventoryLineRequestItemSchema
>;

export type UpdateCarbonInventoryLinesRequest = z.infer<
  typeof UpdateCarbonInventoryLinesRequestSchema
>;

export type UpdateCarbonInventoryLinesResponse = z.infer<
  typeof UpdateCarbonInventoryLinesResponseSchema
>;
