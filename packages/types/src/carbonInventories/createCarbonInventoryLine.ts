import { z } from "zod";
import { CarbonInventoryLineSchema } from "./base.js";

export const CreateCarbonInventoryLineResponseSchema =
  CarbonInventoryLineSchema;

export type CreateCarbonInventoryLineResponse = z.infer<
  typeof CreateCarbonInventoryLineResponseSchema
>;
