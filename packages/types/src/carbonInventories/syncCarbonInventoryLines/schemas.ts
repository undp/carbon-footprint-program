import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { LineFileSummarySchema } from "../schemas.js";

import { InputType } from "../../enums.js";

export const InputTypeSchema = z.enum(InputType);

/**
 * How a line's factor was chosen. The three variants are mutually exclusive and
 * carry disjoint data, so catalog validation can never be bypassed by dressing a
 * custom factor up as a catalog one — which is what inferring "custom" from the
 * source string allowed.
 */
export const FactorSelectionType = {
  /** A row from the emission-factor catalog. The server derives everything. */
  CATALOG: "CATALOG",
  /** A factor the organization typed in itself. */
  CUSTOM: "CUSTOM",
  /** A total the organization declared directly, with no factor at all. */
  DIRECT: "DIRECT",
} as const;

export const FactorSelectionTypeSchema = z.enum(FactorSelectionType);

/**
 * A catalog selection sends only its identity and the unit it wants the factor
 * expressed in. Value, source and year are deliberately absent: the server reads
 * them from the selected row, so a client cannot persist a value that disagrees
 * with the catalog.
 */
export const CatalogFactorSelectionSchema = z
  .object({
    type: z.literal(FactorSelectionType.CATALOG),
    emissionFactorId: IdSchema.describe(
      "The canonical emission_factor row selected, never a converted-representation composite ID"
    ),
    appliedRateMeasurementUnitId: IdSchema.describe(
      "The rate unit to express the factor in; must belong to the factor's numerator/denominator magnitude family"
    ),
  })
  .strict();

export const CustomFactorSelectionSchema = z
  .object({
    type: z.literal(FactorSelectionType.CUSTOM),
    source: z.string().min(1).describe("The source the organization declared"),
    value: z.number().describe("The factor value the organization declared"),
    rateMeasurementUnitId: IdSchema.describe(
      "The rate unit the declared value is expressed in"
    ),
  })
  .strict();

export const DirectFactorSelectionSchema = z
  .object({
    type: z.literal(FactorSelectionType.DIRECT),
    totalEmissions: z
      .number()
      .describe("Total emissions in tons, declared directly without a factor"),
  })
  .strict();

export const FactorSelectionSchema = z
  .discriminatedUnion("type", [
    CatalogFactorSelectionSchema,
    CustomFactorSelectionSchema,
    DirectFactorSelectionSchema,
  ])
  .describe("The factor selection for this line");

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
    emissionFactorId: IdSchema.nullable().describe(
      "The canonical catalog factor applied to this line; null for custom factors and direct totals. Reload restores the selection from this, not from the source text."
    ),
    appliedFactorYear: z
      .number()
      .int()
      .nullable()
      .describe(
        "The reporting year of the catalog factor applied when the line was saved. Null for transversal catalog factors, custom factors and direct totals. Whether it mismatches the footprint year is derived at read time, never stored."
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
    factorSelection: FactorSelectionSchema.nullable().describe(
      "The factor selection, or null while the line is still incomplete"
    ),
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
  comment: true,
})
  .extend({
    inputType: InputTypeSchema.describe(
      "The input type: DIRECT for manual total emissions, SIMPLIFIED for factor-based, EXPERT for custom factors"
    ),
    factorSelection: FactorSelectionSchema.nullable().describe(
      "The factor selection, or null while the line is still incomplete"
    ),
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
