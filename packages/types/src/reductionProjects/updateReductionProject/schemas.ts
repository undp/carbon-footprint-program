import { z } from "zod";
import { ReductionProjectBaseSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

const UpdateReductionProjectFieldsSchema = ReductionProjectBaseSchema.pick({
  name: true,
  organizationId: true,
  carbonInventoryId: true,
  implementationDate: true,
  description: true,
  subcategoryId: true,
  gwpUsed: true,
  useNationalGwp: true,
  consideredGei: true,
  reportedElsewhere: true,
  reportedElsewhereDescription: true,
  year: true,
  baselineScenario: true,
  projectScenario: true,
})
  .partial()
  .strict();

export const UpdateReductionProjectRequestSchema =
  UpdateReductionProjectFieldsSchema.extend({
    fileUuids: z.array(z.uuid()).optional(),
  }).refine(
    (value) => {
      const { fileUuids, ...fields } = value;
      return (
        Object.values(fields).some((v) => v !== undefined) ||
        fileUuids !== undefined
      );
    },
    {
      message:
        "At least one project field or fileUuids must be provided with a defined value",
    }
  );

export const UpdateReductionProjectResponseSchema =
  ReductionProjectBaseSchema.omit({ status: true });
