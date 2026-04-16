import { z } from "zod";

const currentYear = new Date().getFullYear();

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
      .max(currentYear, { message: `Year must not exceed ${currentYear}` })
  )
  .optional();

export const LimitQueryParamSchema = z
  .string()
  .regex(/^\d+$/, { message: "Limit must be a positive integer" })
  .transform((val) => Number(val))
  .pipe(z.number().int().positive());
