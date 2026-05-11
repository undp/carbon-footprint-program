import { z } from "zod";
import {
  MEASUREMENT_UNIT_NAME_MAX_LENGTH,
  MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH,
  ABBREVIATION_REGEX,
} from "@repo/constants";
import { IdSchema } from "../../zod.js";

export const MeasurementUnitMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(MEASUREMENT_UNIT_NAME_MAX_LENGTH, {
      message: `Name must not exceed ${MEASUREMENT_UNIT_NAME_MAX_LENGTH} characters.`,
    }),
  abbreviation: z
    .string()
    .trim()
    .min(1, { message: "Abbreviation is required." })
    .max(MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH, {
      message: `Abbreviation must not exceed ${MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH} characters.`,
    })
    .regex(ABBREVIATION_REGEX, {
      message:
        "Abbreviation must not contain slashes (/) or control characters.",
    }),
  magnitudeId: IdSchema.describe(
    "The id of the magnitude this measurement unit belongs to."
  ),
  baseFactor: z
    .number()
    .positive({ message: "Base factor must be greater than zero." }),
  isBase: z.boolean(),
});

export const MeasurementUnitCreationResultSchema = z.enum([
  "created",
  "fullyRestored",
  "restoredLabelsOnly",
]);

export const MeasurementUnitCreationResultEnum =
  MeasurementUnitCreationResultSchema.enum;
