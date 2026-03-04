import z from "zod";
import { IdSchema } from "../../zod.js";
import { SubmissionSubjectBaseSchema } from "../../baseSchemas/index.js";

export const GetCarbonInventoryBadgesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const ItemSchema = z.object({
  subjectType: SubmissionSubjectBaseSchema.shape.subjectType,
  previewUrl: z.url().describe("The URL of the badge file preview image"),
});

// Response Schemas
export const GetCarbonInventoryBadgesResponseSchema = z.array(ItemSchema);
