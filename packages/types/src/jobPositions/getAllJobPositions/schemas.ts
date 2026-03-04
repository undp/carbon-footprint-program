import { z } from "zod";
import { CountryJobPositionBaseSchema } from "../../baseSchemas/index.js";

export const GetAllJobPositionsResponseSchema = z
  .array(CountryJobPositionBaseSchema.pick({ id: true, name: true }))
  .describe("The job positions of the country");
