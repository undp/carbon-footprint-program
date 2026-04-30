import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const DeleteMeasurementUnitParamsSchema = z.object({
  id: IdSchema,
});

export const DeleteMeasurementUnitResponseSchema = z
  .null()
  .describe("No content in response body");
