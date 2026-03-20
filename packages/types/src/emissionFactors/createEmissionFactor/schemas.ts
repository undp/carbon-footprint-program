import { z } from "zod";
import {
  EmissionFactorBaseSchema,
  SubcategoryBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
  RateMeasurementUnitBaseSchema,
} from "../../baseSchemas/index.js";
import { GasDetailsSchema } from "../../baseSchemas/gasDetails.js";

export const CreateEmissionFactorRequestSchema = z.strictObject({
  subcategoryId: SubcategoryBaseSchema.shape.id,
  dimensionValue1Name: z
    .string()
    .nullable()
    .describe("Name for dimension value 1 (find-or-create)"),
  dimensionValue2Name: z
    .string()
    .nullable()
    .describe("Name for dimension value 2 (find-or-create)"),
  rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
  source: z.string().min(1, "Fuente es requerida"),
  gasDetails: GasDetailsSchema,
  value: z.number(),
});

export const CreateEmissionFactorResponseSchema = EmissionFactorBaseSchema.pick(
  {
    id: true,
    value: true,
    source: true,
  }
).extend({
  subcategoryId: SubcategoryBaseSchema.shape.id,
  subcategoryName: z.string(),
  dimensionValue1Id: EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
  dimensionValue1Name: z.string().nullable(),
  dimensionValue2Id: EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
  dimensionValue2Name: z.string().nullable(),
  rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
  rateMeasurementUnitName: z.string(),
  gasDetails: GasDetailsSchema,
});

// Form schema for frontend (allows temp_ IDs for new rows)
export const EmissionFactorFormSchema = z.object({
  id: z.string().min(1),
  subcategoryId: z.string().min(1, "Sub-categoría es requerida"),
  dimensionValue1Name: z.string().nullable(),
  dimensionValue2Name: z.string().nullable(),
  rateMeasurementUnitId: z.string().min(1, "Unidad es requerida"),
  source: z.string().min(1, "Fuente es requerida"),
  value: z
    .number({ error: "Valor es requerido" })
    .refine((v) => v !== 0, "Debe ser distinto de 0"),
  gasDetails: z.object({
    CO2_FOSSIL: z.number(),
    CH4: z.number(),
    N2O: z.number(),
    HFC: z.number(),
    PFC: z.number(),
    SF6: z.number(),
    NF3: z.number(),
  }),
});
