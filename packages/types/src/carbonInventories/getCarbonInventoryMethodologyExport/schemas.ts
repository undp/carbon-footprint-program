import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { GetMethodologyExportResponseSchema } from "../../methodologies/getMethodologyExport/schemas.js";

export const GetCarbonInventoryMethodologyExportParamsSchema = z
  .object({
    id: IdSchema.describe("The carbon inventory ID"),
  })
  .strict();

/**
 * Literal re-export of the admin methodology export response schema.
 * Re-exporting (instead of redefining) guarantees zero drift between the
 * admin endpoint (`GET /methodologies/:id/export`) and the user-scoped
 * endpoint (`GET /carbon-inventories/:id/methodology-export`).
 */
export const GetCarbonInventoryMethodologyExportResponseSchema =
  GetMethodologyExportResponseSchema;
