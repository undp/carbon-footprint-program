import { z } from "zod";
import {
  EmissionFactorBaseSchema,
  EmissionFactorSourceSchema,
} from "../../baseSchemas/index.js";
import { GasDetailsSchema } from "../../baseSchemas/gasDetails.js";
import { IdSchema } from "../../zod.js";

/** At most this many per-factor changes in one copy request. */
export const EMISSION_FACTOR_YEAR_COPY_MAX_CHANGES = 2000;

/**
 * One source factor's change in a year copy. Every field but the id is
 * optional: a factor without a change is copied as it is. `exclude` wins, so
 * the other fields of an excluded entry are ignored.
 */
export const DuplicateEmissionFactorYearChangeSchema = z.strictObject({
  sourceFactorId: IdSchema.describe("The ID of the source-year factor"),
  value: z
    .number()
    .optional()
    .describe("The value of the copy; the source factor's when omitted"),
  source: EmissionFactorSourceSchema.optional().describe(
    "The source of the copy; the source factor's when omitted"
  ),
  gasDetails: GasDetailsSchema.optional().describe(
    "The gas breakdown of the copy; the source factor's when omitted"
  ),
  exclude: z
    .literal(true)
    .optional()
    .describe("Leave the factor out of the copy"),
});

export const DuplicateEmissionFactorYearRequestSchema = z
  .strictObject({
    methodologyVersionId: IdSchema.describe(
      "The ID of the methodology version whose factors are copied"
    ),
    sourceYear: EmissionFactorBaseSchema.shape.year.describe(
      "The year the factors are copied from"
    ),
    targetYear: EmissionFactorBaseSchema.shape.year.describe(
      "The year the factors are copied into"
    ),
    changes: z
      .array(DuplicateEmissionFactorYearChangeSchema)
      .max(EMISSION_FACTOR_YEAR_COPY_MAX_CHANGES)
      .describe("Per-factor changes; at most one entry per source factor"),
  })
  .refine((request) => request.sourceYear !== request.targetYear, {
    message: "El año de destino debe ser distinto del año de origen",
    path: ["targetYear"],
  });

export const DuplicateEmissionFactorYearResponseSchema = z.object({
  copiedCount: z.number().int().min(0).describe("Factors created"),
  editedCount: z
    .number()
    .int()
    .min(0)
    .describe(
      "Factors created with a value, source or gas breakdown that differs from their source factor"
    ),
  excludedCount: z
    .number()
    .int()
    .min(0)
    .describe("Source factors left out by the request"),
  // An object so a new reason adds a field instead of changing the shape.
  skipped: z.object({
    existingCount: z
      .number()
      .int()
      .min(0)
      .describe("Source factors whose row already exists in the target year"),
  }),
});

/**
 * Why a year copy is refused (422 `EMISSION_FACTOR_YEAR_COPY_INVALID`). Each
 * violation names the source factor it belongs to.
 *
 * | Reason                    | Copy page            | API                          |
 * | ------------------------- | -------------------- | ---------------------------- |
 * | `DUPLICATE_TARGET_FACTOR` | blocks               | 422                          |
 * | `EMPTY_SOURCE`            | blocks (page only)   | never: the contract 400s     |
 * | `EMPTY_VALUE`             | blocks (page only)   | never: a number or no value  |
 * | `UNKNOWN_SOURCE_FACTOR`   | cannot happen        | 422                          |
 * | `DUPLICATE_CHANGE`        | cannot happen        | 422                          |
 * | `GAS_DETAILS_MISMATCH`    | avoided by its lock  | 422 (API only, not planned)  |
 */
export const EmissionFactorYearCopyViolationReason = {
  /** Two copied factors end on the same row with the same source. */
  DUPLICATE_TARGET_FACTOR: "DUPLICATE_TARGET_FACTOR",
  /** A copied factor's source is empty. Page only. */
  EMPTY_SOURCE: "EMPTY_SOURCE",
  /** A copied factor's value is empty. Page only. */
  EMPTY_VALUE: "EMPTY_VALUE",
  /** A copied factor's gas breakdown does not match its value. API only. */
  GAS_DETAILS_MISMATCH: "GAS_DETAILS_MISMATCH",
  /** A change names a factor that is not a visible source-year factor. */
  UNKNOWN_SOURCE_FACTOR: "UNKNOWN_SOURCE_FACTOR",
  /** Two changes name the same source factor. */
  DUPLICATE_CHANGE: "DUPLICATE_CHANGE",
} as const;

export type EmissionFactorYearCopyViolationReason =
  (typeof EmissionFactorYearCopyViolationReason)[keyof typeof EmissionFactorYearCopyViolationReason];

export const EmissionFactorYearCopyViolationReasonSchema = z.enum(
  EmissionFactorYearCopyViolationReason
);

export const EmissionFactorYearCopyViolationSchema = z.object({
  sourceFactorId: IdSchema.describe("The source factor the violation is on"),
  reason: EmissionFactorYearCopyViolationReasonSchema,
});

/** The `details` of a 422 `EMISSION_FACTOR_YEAR_COPY_INVALID`. */
export const EmissionFactorYearCopyInvalidDetailsSchema = z.object({
  violations: z.array(EmissionFactorYearCopyViolationSchema),
});
