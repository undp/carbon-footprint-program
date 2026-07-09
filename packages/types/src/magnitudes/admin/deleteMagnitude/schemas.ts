import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const DeleteMagnitudeParamsSchema = z.object({
  id: IdSchema,
});
