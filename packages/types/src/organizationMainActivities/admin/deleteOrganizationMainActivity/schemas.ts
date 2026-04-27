import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminOrganizationMainActivitySchema } from "../shared/schemas.js";

export const DeleteOrganizationMainActivityParamsSchema = z.strictObject({
  id: IdSchema.describe("ID de la actividad principal a eliminar"),
});

export const DeleteOrganizationMainActivityResponseSchema =
  AdminOrganizationMainActivitySchema;
