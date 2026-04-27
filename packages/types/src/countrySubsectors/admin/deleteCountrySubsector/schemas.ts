import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { AdminCountrySubsectorSchema } from "../shared/schemas.js";

export const DeleteCountrySubsectorParamsSchema = z.strictObject({
  id: IdSchema.describe("ID del subrubro a eliminar"),
});

export const DeleteCountrySubsectorResponseSchema = AdminCountrySubsectorSchema;
