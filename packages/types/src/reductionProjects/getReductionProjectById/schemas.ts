import { z } from "zod";
import {
  CarbonInventoryBaseSchema,
  OrganizationSummaryBaseSchema,
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
      organization: z.object({
        id: IdSchema.describe("The ID of the organization"),
        name: OrganizationSummaryBaseSchema.shape.name
          .nullable()
          .describe("Resolved organization name, null if no summary set"),
      }),
      carbonInventory: z.object({
        id: IdSchema.describe("The ID of the linked carbon inventory"),
        name: CarbonInventoryBaseSchema.shape.name,
        year: CarbonInventoryBaseSchema.shape.year,
      }),
      subcategory: SubcategoryBaseSchema.pick({ id: true, name: true }),
      status: ReductionProjectDisplayStatusSchema.describe(
        "Workflow display status derived from submissions"
      ),
    }
  );
