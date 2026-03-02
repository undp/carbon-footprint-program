import { z } from "zod";
import { IdSchema } from "../zod.js";
import { InputType } from "../enums.js";
import { UserBaseSchema } from "./user.js";

const InputTypeSchema = z.enum(InputType);

export const CarbonInventoryLineInputBaseSchema = z.object({
  id: IdSchema.describe("The carbon inventory line input ID"),
  lineId: IdSchema.describe("The associated carbon inventory line ID"),
  inputType: InputTypeSchema.describe(
    "The type of input (e.g. 'SELECTION', 'QUANTITY', 'DIRECT')"
  ),
  selection1Id: IdSchema.nullable().describe(
    "The first selection dimension value ID, if applicable"
  ),
  selection2Id: IdSchema.nullable().describe(
    "The second selection dimension value ID, if applicable"
  ),
  quantity: z.number().nullable().describe("The input quantity, if applicable"),
  measurementUnitId: IdSchema.nullable().describe(
    "The measurement unit ID for the quantity, if applicable"
  ),
  directTotalEmissions: z
    .number()
    .nullable()
    .describe("The total emissions for DIRECT input type, in tCO2e"),
  manualFactor: z
    .number()
    .nullable()
    .describe("The manually entered emission factor, if applicable"),
  manualFactorSource: z
    .string()
    .nullable()
    .describe("The source of the manually entered emission factor"),
  manualFactorRateUnitId: IdSchema.nullable().describe(
    "The measurement unit ID for the manually entered emission factor rate, if applicable"
  ),
  comment: z
    .string()
    .nullable()
    .describe("Any additional comments for this line input"),
  isActive: z.boolean().describe("Whether this line input is active"),
  createdAt: z
    .date()
    .describe("The date and time when this line input was created"),
  updatedAt: z
    .date()
    .nullable()
    .describe("The date and time when this line input was last updated"),
  createdById: UserBaseSchema.shape.id.nullable(),
  updatedById: UserBaseSchema.shape.id.nullable(),
});
