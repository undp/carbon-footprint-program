import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileSummarySchema } from "../schemas.js";

import { InputType } from "../../enums.js";

export const InputTypeSchema = z.enum(InputType);

const LineItemSchema = z
  .object({
    id: IdSchema.describe("The ID of the line"),
    subcategoryId: IdSchema.describe("The ID of the subcategory"),
    isManualTotalEmissions: z
      .boolean()
      .describe("Whether manual total emissions are used"),
    dimensionValue1Id: IdSchema.nullable().describe(
      "The ID of the first dimension value (position 1)"
    ),
    dimensionValue2Id: IdSchema.nullable().describe(
      "The ID of the second dimension value (position 2)"
    ),
    quantity: z
      .number()
      .nonnegative()
      .nullable()
      .describe("The quantity value"),
    measurementUnitId: IdSchema.nullable().describe(
      "The ID of the measurement unit"
    ),
    factorSource: z.string().nullable().describe("The source of the factor"),
    factorValue: z.number().nullable().describe("The factor value"),
    factorRateMeasurementUnitId: IdSchema.nullable().describe(
      "The ID of the rate measurement unit of the factor"
    ),
    comment: z.string().nullable().describe("Comment for the line"),
    manualTotalEmissions: z
      .number()
      .nullable()
      .describe("Manual total emissions value"),
    files: z
      .array(LineFileSummarySchema)
      .default([])
      .describe("The files attached to this line"),
  })
  .strict();

// Schema for creating a new line (no id required, subcategoryId is required)
export const SyncCreateLineItemSchema = z
  .object({
    subcategoryId: IdSchema.describe("The ID of the subcategory for this line"),
    inputType: InputTypeSchema.describe(
      "The input type: DIRECT for manual total emissions, SIMPLIFIED for factor-based, EXPERT for custom factors"
    ),
    dimensionValue1Id: LineItemSchema.shape.dimensionValue1Id,
    dimensionValue2Id: LineItemSchema.shape.dimensionValue2Id,
    quantity: LineItemSchema.shape.quantity,
    measurementUnitId: LineItemSchema.shape.measurementUnitId,
    factorSource: LineItemSchema.shape.factorSource,
    baseFactorId: IdSchema.nullable().describe(
      "The ID of the base emission factor (null for manual factors)"
    ),
    appliedFactorValue: LineItemSchema.shape.factorValue,
    appliedFactorRateMeasurementUnitId:
      LineItemSchema.shape.factorRateMeasurementUnitId,
    manualTotalEmissions: LineItemSchema.shape.manualTotalEmissions,
    comment: LineItemSchema.shape.comment,
    addFileUuids: z
      .array(z.uuid())
      .default([])
      .describe("UUIDs of files to link to the line on creation"),
  })
  .strict();

// Schema for updating an existing line (id required)
export const SyncUpdateLineItemSchema = LineItemSchema.pick({
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
    inputType: InputTypeSchema.describe(
      "The input type: DIRECT for manual total emissions, SIMPLIFIED for factor-based, EXPERT for custom factors"
    ),
    baseFactorId: IdSchema.nullable().describe(
      "The ID of the base emission factor (null for manual factors)"
    ),
    appliedFactorValue: LineItemSchema.shape.factorValue,
    appliedFactorRateMeasurementUnitId:
      LineItemSchema.shape.factorRateMeasurementUnitId,
    addFileUuids: z
      .array(z.uuid())
      .default([])
      .describe("UUIDs of files to link to the line"),
    removeFileIds: z
      .array(IdSchema)
      .default([])
      .describe("IDs of currently-linked files to unlink and soft-delete"),
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
  created: z.array(LineItemSchema).describe("Lines that were created"),
  updated: z.array(LineItemSchema).describe("Lines that were updated"),
  deleted: z.array(IdSchema).describe("IDs of lines that were deleted"),
});

export const SyncCarbonInventoryLinesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
