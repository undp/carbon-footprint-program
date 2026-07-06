import { z } from "zod";
import { ReductionProjectBaseSchema } from "../baseSchemas/index.js";

export const ReductionProjectDisplayStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "REJECTED",
  "APPROVED",
  "DELETED",
]);

export const ReductionProjectDisplayStatusEnum =
  ReductionProjectDisplayStatusSchema.enum;

/**
 * Shared write body for create and update. `name`/`organizationId`/
 * `carbonInventoryId` are required; the deferred business fields inherit
 * `.nullable()` from the base and are always sent (never `.optional()`), so a
 * single save persists whatever the form filled — full or partial. Files and
 * submissions are handled only by `request-verification`, so no `fileUuids`.
 */
export const ReductionProjectWriteBodySchema = ReductionProjectBaseSchema.pick({
  name: true,
  organizationId: true,
  carbonInventoryId: true,
  implementationDate: true,
  description: true,
  subcategoryId: true,
  gwpUsed: true,
  consideredGei: true,
  reportedElsewhere: true,
  reportedElsewhereDescription: true,
  year: true,
  baselineScenario: true,
  projectScenario: true,
});
