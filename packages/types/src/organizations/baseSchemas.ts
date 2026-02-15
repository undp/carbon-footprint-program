import { z } from "zod";
import { IdSchema } from "../zod.js";

/**
 * Shared schemas used by BOTH admin and app organization endpoints
 */

// Base entity reference (id + name)
export const EntityReferenceSchema = z.object({
  id: IdSchema.describe("The entity ID"),
  name: z.string().describe("The entity name"),
});

// Organization display status (derived from submission state and organization status)
export const OrganizationDisplayStatusSchema = z.enum([
  "ACCREDITED",
  "NOT_ACCREDITED",
  "BLOCKED",
]);

// Simple organization list item (id + name)
export const OrganizationListItemSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z.string().describe("The organization name"),
});

export const OrganizationDisplayStatusValues =
  OrganizationDisplayStatusSchema.enum;
