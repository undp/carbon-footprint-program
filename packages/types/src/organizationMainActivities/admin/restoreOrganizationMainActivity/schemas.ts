import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const RestoreOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the organization main activity to restore"),
});

export const RestoreOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
