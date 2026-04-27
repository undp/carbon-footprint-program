import { z } from "zod";
import { ExplanationBaseSchema } from "../../../baseSchemas/index.js";

export const GetAllExplanationsResponseSchema = z.array(ExplanationBaseSchema);
