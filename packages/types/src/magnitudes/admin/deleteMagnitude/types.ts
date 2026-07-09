import { z } from "zod";
import type { DeleteMagnitudeParamsSchema } from "./schemas.js";

export type DeleteMagnitudeParams = z.infer<typeof DeleteMagnitudeParamsSchema>;
