import { z } from "zod";
import { CarbonInventoryLineSchema } from "./base.js";
import { IdSchema } from "../zod.js";

// Schema for creating a new line (no id required, subcategoryId is required)
export const SyncCreateLineItemSchema = z
  .object({
    subcategoryId: IdSchema.describe("The ID of the subcategory for this line"),
    dimensionValue1Id: CarbonInventoryLineSchema.shape.dimensionValue1Id,
    dimensionValue2Id: CarbonInventoryLineSchema.shape.dimensionValue2Id,
    quantity: CarbonInventoryLineSchema.shape.quantity,
    measurementUnitId: CarbonInventoryLineSchema.shape.measurementUnitId,
    factorSource: CarbonInventoryLineSchema.shape.factorSource,
    baseFactorId: IdSchema.nullable().describe(
      "The ID of the base emission factor (null for manual factors)"
    ),
    appliedFactorValue: CarbonInventoryLineSchema.shape.factorValue,
    appliedFactorRateMeasurementUnitId:
      CarbonInventoryLineSchema.shape.factorRateMeasurementUnitId,
    manualTotalEmissions: CarbonInventoryLineSchema.shape.manualTotalEmissions,
    comment: CarbonInventoryLineSchema.shape.comment,
  })
  .strict();

// Schema for updating an existing line (id required)
export const SyncUpdateLineItemSchema = CarbonInventoryLineSchema.pick({
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
    baseFactorId: IdSchema.nullable().describe(
      "The ID of the base emission factor (null for manual factors)"
    ),
    appliedFactorValue: CarbonInventoryLineSchema.shape.factorValue,
    appliedFactorRateMeasurementUnitId:
      CarbonInventoryLineSchema.shape.factorRateMeasurementUnitId,
  })
  .strict();

// Schema for deleting a line (only id required)
export const SyncDeleteLineItemSchema = z
  .object({
    id: IdSchema.describe("The ID of the line to delete"),
  })
  .strict();

// Main sync request schema
export const SyncCarbonInventoryLinesRequestSchema = z
  .object({
    create: z
      .array(SyncCreateLineItemSchema)
      .default([])
      .describe("Lines to create"),
    update: z
      .array(SyncUpdateLineItemSchema)
      .default([])
      .describe("Lines to update"),
    delete: z
      .array(SyncDeleteLineItemSchema)
      .default([])
      .describe("Lines to delete"),
  })
  .strict()
  .refine(
    (data) => {
      // Ensure no duplicate IDs in update array
      const updateIds = data.update.map((item) => item.id);
      const uniqueUpdateIds = new Set(updateIds);
      return updateIds.length === uniqueUpdateIds.size;
    },
    {
      message: "Duplicate line IDs in update array are not allowed",
    }
  )
  .refine(
    (data) => {
      // Ensure no duplicate IDs in delete array
      const deleteIds = data.delete.map((item) => item.id);
      const uniqueDeleteIds = new Set(deleteIds);
      return deleteIds.length === uniqueDeleteIds.size;
    },
    {
      message: "Duplicate line IDs in delete array are not allowed",
    }
  )
  .refine(
    (data) => {
      // Ensure no overlap between update and delete IDs
      const updateIds = new Set(data.update.map((item) => item.id));
      const deleteIds = data.delete.map((item) => item.id);
      return !deleteIds.some((id) => updateIds.has(id));
    },
    {
      message: "A line cannot be both updated and deleted in the same request",
    }
  );

// Response schema - returns all lines after sync
export const SyncCarbonInventoryLinesResponseSchema = z.object({
  created: z
    .array(CarbonInventoryLineSchema)
    .describe("Lines that were created"),
  updated: z
    .array(CarbonInventoryLineSchema)
    .describe("Lines that were updated"),
  deleted: z.array(IdSchema).describe("IDs of lines that were deleted"),
});

// TypeScript types
export type SyncCreateLineItem = z.infer<typeof SyncCreateLineItemSchema>;

export type SyncUpdateLineItem = z.infer<typeof SyncUpdateLineItemSchema>;

export type SyncDeleteLineItem = z.infer<typeof SyncDeleteLineItemSchema>;

export type SyncCarbonInventoryLinesRequest = z.infer<
  typeof SyncCarbonInventoryLinesRequestSchema
>;

export type SyncCarbonInventoryLinesResponse = z.infer<
  typeof SyncCarbonInventoryLinesResponseSchema
>;
