import { z } from "zod";
import { IdSchema } from "../zod.js";

export const SystemParameterBaseSchema = z.object({
  id: IdSchema.describe("The ID of the system parameter"),
  key: z.string().describe("The unique key identifying the parameter"),
  value: z.string().describe("The current value of the parameter"),
  description: z
    .string()
    .describe("A user-facing description of the parameter"),
  type: z.string().describe("The parameter type (e.g. selector)"),
  options: z
    .array(z.string())
    .describe("Available options for selector-type parameters"),
});

export type SystemParameter = z.infer<typeof SystemParameterBaseSchema>;
