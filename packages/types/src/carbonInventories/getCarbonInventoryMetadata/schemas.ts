import { z } from "zod";
import { CarbonInventorySchema } from "../baseSchemas.js";

export const GetCarbonInventoryMetadataResponseSchema = z
  .object({
    id: CarbonInventorySchema.shape.id,
    name: CarbonInventorySchema.shape.name,
    country: z.string().nullable().describe("The country name"),
    organizationName: z.string().nullable().describe("The organization name"),
    organizationBranchesQuantity: z
      .number()
      .int()
      .nullable()
      .describe("Number of organization branches"),
    organizationSectorName: z
      .string()
      .nullable()
      .describe("The organization sector name"),
    organizationSizeName: z
      .string()
      .nullable()
      .describe("The organization size name"),
    organizationMainActivityName: z
      .string()
      .nullable()
      .describe("The organization main activity name"),
    organizationMainActivityQuantity: z
      .number()
      .nullable()
      .describe("The quantity of the organization main activity"),
  })
  .strict();
