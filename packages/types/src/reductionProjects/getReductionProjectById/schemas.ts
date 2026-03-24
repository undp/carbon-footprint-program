import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const GetReductionProjectByIdParamsSchema = z.object({
  id: IdSchema,
});

export const GetReductionProjectByIdResponseSchema = ReductionProjectSchema;
