import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const RestoreOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("ID de la actividad principal a restaurar"),
});

export const RestoreOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
