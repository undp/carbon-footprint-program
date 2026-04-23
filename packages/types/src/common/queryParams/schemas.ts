import { z } from "zod";

// Uses /^\d+$/ guard (consistent with pagination schemas) to reject scientific
// notation ("1e3") and hex ("0x10") before numeric coercion.
export const YearQueryParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Year must be a positive integer" })
  .transform((val) => Number(val))
  .pipe(
    z
      .number()
      .int()
      .positive()
      .refine((year) => year <= new Date().getFullYear(), {
        message: "Year must not exceed the current year",
      })
  )
  .optional();

const MAX_LIMIT = 100;

export const LimitQueryParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Limit must be a positive integer" })
  .transform((val) => Number(val))
  .pipe(
    z
      .number()
      .int()
      .positive()
      .max(MAX_LIMIT, { message: `Limit must not exceed ${MAX_LIMIT}` })
  );
