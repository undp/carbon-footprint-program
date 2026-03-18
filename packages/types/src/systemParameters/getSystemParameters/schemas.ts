import { z } from "zod";
import { SystemParameterBaseSchema } from "../../baseSchemas/index.js";
import { listQueryParam } from "../../zod.js";

export const GetSystemParametersQuerySchema = z.object({
  keys: listQueryParam().optional().describe("Comma-separated parameter keys"),
});

export const GetSystemParametersResponseSchema = z.array(
  SystemParameterBaseSchema.pick({ key: true, value: true })
);
