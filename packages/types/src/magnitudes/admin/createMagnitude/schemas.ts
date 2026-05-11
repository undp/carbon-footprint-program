import { z } from "zod";
import {
  MAGNITUDE_NAME_MAX_LENGTH,
  MAGNITUDE_CODE_MAX_LENGTH,
  MAGNITUDE_CODE_REGEX,
} from "@repo/constants";
import { MagnitudeBaseSchema } from "../../../baseSchemas/magnitude.js";

export const CreateMagnitudeBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, { message: "Code is required." })
    .max(MAGNITUDE_CODE_MAX_LENGTH, {
      message: `Code must not exceed ${MAGNITUDE_CODE_MAX_LENGTH} characters.`,
    })
    .regex(MAGNITUDE_CODE_REGEX, {
      message:
        "Code must be lowercase, start with a letter, and contain only letters, numbers, or underscores (e.g. vehicles).",
    }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(MAGNITUDE_NAME_MAX_LENGTH, {
      message: `Name must not exceed ${MAGNITUDE_NAME_MAX_LENGTH} characters.`,
    }),
});

export const MagnitudeCreationActionSchema = z.enum([
  "created",
  "fullyRestored",
]);

export const MagnitudeCreationActionEnum = MagnitudeCreationActionSchema.enum;

export const CreateMagnitudeResponseSchema = MagnitudeBaseSchema.extend({
  referenceCount: z.number().int().nonnegative(),
  action: MagnitudeCreationActionSchema,
});
