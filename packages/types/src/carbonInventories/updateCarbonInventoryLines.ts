import { z } from "zod";
import { CarbonInventoryLineSchema } from "./base.js";

// Request schema for updating lines
export const UpdateCarbonInventoryLineRequestItemSchema =
  CarbonInventoryLineSchema.pick({
    id: true,
    dimensionValue1Id: true,
    dimensionValue2Id: true,
    quantity: true,
    measurementUnitId: true,
    factorSource: true,
    manualTotalEmissions: true,
    comment: true,
  })
    .extend({
      baseFactorId: z
        .string()
        .regex(/^\d+$/)
        .nullable()
        .describe(
          "The ID of the base emission factor (null for manual factors)"
        ),
      appliedFactorValue: CarbonInventoryLineSchema.shape.factorValue,
      appliedFactorRateMeasurementUnitId:
        CarbonInventoryLineSchema.shape.factorRateMeasurementUnitId,
    })
    .strict()
    .refine(
      (data) => {
        // If manualTotalEmissions is provided, all other fields must be null
        if (data.manualTotalEmissions !== null) {
          return (
            data.dimensionValue1Id === null &&
            data.dimensionValue2Id === null &&
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
        message:
          "If factorSource is 'Factor Propio', baseFactorId must be null",
      }
    );

export const UpdateCarbonInventoryLinesRequestSchema = z
  .array(UpdateCarbonInventoryLineRequestItemSchema)
  .refine(
    (data) => {
      const ids = data.map((item) => item.id);
      const uniqueIds = new Set(ids);
      return ids.length === uniqueIds.size;
    },
    {
      message: "Duplicate line IDs are not allowed",
    }
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
