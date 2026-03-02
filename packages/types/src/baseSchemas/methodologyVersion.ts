import { z } from "zod";
import { IdSchema } from "../zod.js";
import { UserBaseSchema } from "./user.js";
import { MethodologyVersionStatus } from "../enums.js";

export const MethodologyVersionStatusSchema = z.enum(MethodologyVersionStatus);

export const MethodologyVersionBaseSchema = z.object({
  id: IdSchema.describe("The ID of the methodology version"),
  countryId: IdSchema.describe(
    "The ID of the country this methodology version belongs to"
  ),
  name: z.string().min(1).max(255).describe("The name of the methodology"),
  description: z.string().describe("The description of the methodology"),
  regulation: z
    .string()
    .min(1)
    .max(255)
    .describe("The regulation associated with the methodology"),
  version: z
    .string()
    .min(1)
    .max(100)
    .describe("The version of the methodology"),
  status: MethodologyVersionStatusSchema.describe(
    "The status of the methodology version"
  ),
  createdAt: z.iso
    .datetime()
    .describe("The creation date of the methodology version"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update date of the methodology version"),
  createdById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who created the methodology version"),
  updatedById: UserBaseSchema.shape.id
    .nullable()
    .describe("The ID of the user who last updated the methodology version"),
});
