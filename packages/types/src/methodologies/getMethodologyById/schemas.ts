import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  CategoryBaseSchema,
  MethodologyVersionBaseSchema,
  SubcategoryBaseSchema,
} from "../../baseSchemas/index.js";

export const GetMethodologyByIdParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the methodology to retrieve"),
  })
  .strict();

export const GetMethodologyByIdResponseSchema =
  MethodologyVersionBaseSchema.pick({
    id: true,
    name: true,
    status: true,
  }).extend({
    categories: z
      .array(
        CategoryBaseSchema.pick({
          id: true,
          name: true,
        }).extend({
          subcategories: z
            .array(
              SubcategoryBaseSchema.pick({
                id: true,
                name: true,
              })
            )
            .describe("Active subcategories belonging to this category"),
        })
      )
      .describe(
        "Active categories of the methodology, ordered by position ascending"
      ),
  });
