import { z } from "zod";
import {
  ReductionProjectBaseSchema,
  SubcategoryBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";
import { ReductionProjectDisplayStatusSchema } from "../schemas.js";

export const GetReductionProjectByIdParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const GetReductionProjectByIdResponseSchema =
  ReductionProjectBaseSchema.omit({ status: true, subcategoryId: true }).extend(
    {
      subcategory: SubcategoryBaseSchema.pick({ id: true, name: true }),
      status: ReductionProjectDisplayStatusSchema.describe(
        "Workflow display status derived from submissions"
      ),
    }
  );
