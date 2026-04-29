import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const MethodologyIdQuerySchema = z.object({
  methodologyId: IdSchema.describe(
    "The ID of the methodology version to scope recommendations to"
  ),
});

export type MethodologyIdQuery = z.infer<typeof MethodologyIdQuerySchema>;
