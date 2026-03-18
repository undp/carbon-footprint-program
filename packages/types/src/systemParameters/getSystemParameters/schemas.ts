import { z } from "zod";
import { SystemParameterBaseSchema } from "../../baseSchemas/index.js";

export const GetSystemParametersQuerySchema = z.object({
  keys: z.string().optional().describe("Comma-separated parameter keys"),
});

export const GetSystemParametersResponseSchema = z.array(
  SystemParameterBaseSchema.pick({ key: true, value: true })
);
