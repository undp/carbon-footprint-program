import { z } from "zod";
import { MAGNITUDE_NAME_MAX_LENGTH } from "@repo/constants";
import { IdSchema } from "../../../zod.js";
import { MagnitudeBaseSchema } from "../../../baseSchemas/magnitude.js";

export const UpdateMagnitudeParamsSchema = z.object({
  id: IdSchema,
});

export const UpdateMagnitudeBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Name is required." })
      .max(MAGNITUDE_NAME_MAX_LENGTH, {
        message: `Name must not exceed ${MAGNITUDE_NAME_MAX_LENGTH} characters.`,
      }),
  })
  .strict();

export const UpdateMagnitudeResponseSchema = MagnitudeBaseSchema.extend({
  referenceCount: z.number().int().nonnegative(),
});
